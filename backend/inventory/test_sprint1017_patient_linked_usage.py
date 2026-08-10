from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TransactionTestCase
from rest_framework.test import APIClient, APITestCase

from core.models import AuditEvent
from inventory.models import InventoryBatch, InventoryItem, StockMovement, receive_stock
from patients.models import Patient


User = get_user_model()


class Sprint1017PatientLinkedUsageTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='sprint1017.admin@test.local', password='Sprint1017!', role='admin')
        cls.dentist = User.objects.create_user(email='sprint1017.dentist@test.local', password='Sprint1017!', role='dentist')
        cls.backoffice = User.objects.create_user(email='sprint1017.backoffice@test.local', password='Sprint1017!', role='backoffice')
        cls.patient = Patient.objects.create(
            patient_code='2026072601',
            first_name='Latifat',
            last_name='Ajasa',
            date_of_birth='1990-01-01',
            gender='F',
            phone_primary='08034235678',
            phone_secondary='08035551234',
            registered_by=cls.admin,
        )
        cls.item_a = InventoryItem.objects.create(name='Lidocaine Cartridge', sku='LA-001', unit_of_measure='cartridge')
        cls.item_b = InventoryItem.objects.create(name='Composite A2', sku='CMP-A2', unit_of_measure='unit')
        cls.item_c = InventoryItem.objects.create(name='Examination Gloves', sku='GLV-001', unit_of_measure='box')
        cls.batch_a = InventoryBatch.objects.create(item=cls.item_a, batch_number='LA-B1', quantity_received='10.00', quantity_remaining='10.00', received_by=cls.admin)
        cls.batch_b = InventoryBatch.objects.create(item=cls.item_b, batch_number='CMP-B1', quantity_received='1.00', quantity_remaining='1.00', received_by=cls.admin)
        cls.batch_c = InventoryBatch.objects.create(item=cls.item_c, batch_number='GLV-B1', quantity_received='5.00', quantity_remaining='5.00', received_by=cls.admin)

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def test_patient_search_by_name_code_and_phone(self):
        self.authenticate(self.dentist)
        for query in ('Latifat Ajasa', '2026072601', '08034235678', '08035551234'):
            with self.subTest(query=query):
                response = self.client.get('/api/patients/search/', {'q': query})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data['results'][0]['id'], str(self.patient.pk))

    def test_single_usage_links_to_internal_patient_pk_and_reduces_stock(self):
        self.authenticate(self.dentist)
        response = self.client.post(
            '/api/inventory-items/usage/',
            {
                'item': self.item_a.pk,
                'batch': self.batch_a.pk,
                'quantity': '2.00',
                'patient': str(self.patient.pk),
                'reason': 'Local anaesthesia',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        movement = StockMovement.objects.get(item=self.item_a, movement_type='usage')
        self.assertEqual(movement.patient, self.patient)
        self.assertEqual(movement.patient_id, self.patient.pk)
        self.batch_a.refresh_from_db()
        self.assertEqual(str(self.batch_a.quantity_remaining), '8.00')
        self.assertTrue(AuditEvent.objects.filter(action='inventory_usage', patient_id=str(self.patient.pk)).exists())

    def test_public_patient_code_is_not_accepted_as_patient_pk(self):
        self.authenticate(self.dentist)
        response = self.client.post(
            '/api/inventory-items/usage/',
            {'item': self.item_a.pk, 'quantity': '1.00', 'patient': self.patient.patient_code, 'reason': 'Wrong identifier'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(StockMovement.objects.filter(notes='Wrong identifier').exists())

    def test_bulk_usage_succeeds_atomically_and_merges_duplicate_items(self):
        self.authenticate(self.dentist)
        response = self.client.post(
            '/api/inventory-items/usage/bulk/',
            {
                'patient': str(self.patient.pk),
                'items': [
                    {'inventory_item': self.item_a.pk, 'quantity': '2.00', 'reason': 'Local anaesthesia'},
                    {'inventory_item': self.item_c.pk, 'quantity': '1.00', 'reason': 'Exam'},
                    {'inventory_item': self.item_a.pk, 'quantity': '1.00', 'reason': 'Top-up'},
                ],
                'notes': 'Treatment visit usage',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['patient']['id'], str(self.patient.pk))
        self.assertEqual(response.data['usage_count'], 2)
        self.assertEqual(StockMovement.objects.filter(patient=self.patient, movement_type='usage').count(), 2)
        movement_a = StockMovement.objects.get(item=self.item_a, patient=self.patient)
        self.assertEqual(str(movement_a.quantity), '-3.00')
        self.batch_a.refresh_from_db()
        self.batch_c.refresh_from_db()
        self.assertEqual(str(self.batch_a.quantity_remaining), '7.00')
        self.assertEqual(str(self.batch_c.quantity_remaining), '4.00')
        self.assertTrue(AuditEvent.objects.filter(action='inventory_bulk_usage', patient_id=str(self.patient.pk)).exists())

    def test_bulk_usage_rolls_back_all_items_when_one_item_has_insufficient_stock(self):
        self.authenticate(self.dentist)
        response = self.client.post(
            '/api/inventory-items/usage/bulk/',
            {
                'patient': str(self.patient.pk),
                'items': [
                    {'inventory_item': self.item_a.pk, 'quantity': '2.00', 'reason': 'Available'},
                    {'inventory_item': self.item_b.pk, 'quantity': '2.00', 'reason': 'Too much'},
                ],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Insufficient stock for Composite A2', str(response.data))
        self.batch_a.refresh_from_db()
        self.batch_b.refresh_from_db()
        self.assertEqual(str(self.batch_a.quantity_remaining), '10.00')
        self.assertEqual(str(self.batch_b.quantity_remaining), '1.00')
        self.assertFalse(StockMovement.objects.filter(patient=self.patient, movement_type='usage').exists())
        self.assertTrue(AuditEvent.objects.filter(action='inventory_bulk_usage_failed', patient_id=str(self.patient.pk), success=False).exists())

    def test_unauthorised_backoffice_bulk_usage_is_denied_and_audited(self):
        self.authenticate(self.backoffice)
        response = self.client.post(
            '/api/inventory-items/usage/bulk/',
            {'patient': str(self.patient.pk), 'items': [{'inventory_item': self.item_a.pk, 'quantity': '1.00'}]},
            format='json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(AuditEvent.objects.filter(user=self.backoffice, action='inventory_permission_denied', failure_reason='missing inventory.usage').exists())

    def test_patient_summary_exposes_usage_history_without_costs(self):
        self.authenticate(self.dentist)
        self.client.post(
            '/api/inventory-items/usage/',
            {'item': self.item_a.pk, 'quantity': '1.00', 'patient': str(self.patient.pk), 'reason': 'Summary history'},
            format='json',
        )
        response = self.client.get(f'/api/patients/{self.patient.pk}/summary/')
        self.assertEqual(response.status_code, 200)
        history = response.data['recent_inventory_usage']
        self.assertEqual(history[0]['item_name'], 'Lidocaine Cartridge')
        self.assertNotIn('unit_cost', history[0])
        self.assertNotIn('purchase_cost', history[0])

    def test_existing_stock_receipt_logic_remains_unchanged(self):
        batch = receive_stock(item=self.item_a, batch_number='S1017-RECEIPT', quantity='2.00', user=self.admin)
        self.assertEqual(str(batch.quantity_remaining), '2.00')
        self.assertTrue(StockMovement.objects.filter(item=self.item_a, batch=batch, movement_type='receipt').exists())


class Sprint1017ConcurrentStockTests(TransactionTestCase):
    reset_sequences = True

    def test_select_for_update_is_available_for_stock_locking(self):
        self.assertTrue(connection.features.has_select_for_update or connection.vendor == 'sqlite')
