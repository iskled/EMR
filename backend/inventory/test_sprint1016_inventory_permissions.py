from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from core.models import AuditEvent
from core.permissions import has_permission
from inventory.models import InventoryBatch, InventoryCategory, InventoryItem, StockMovement, Supplier


User = get_user_model()


class Sprint1016InventoryPermissionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.users = {
            role: User.objects.create_user(
                email=f'sprint1016.{role}@test.local',
                password='Sprint1016!Test',
                role=role,
            )
            for role in ('admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice')
        }
        cls.item = InventoryItem.objects.create(
            name='Sprint 10.16 Usage Item',
            sku='S1016-USAGE',
            unit_of_measure='box',
            allow_negative_stock=True,
        )
        cls.batch = InventoryBatch.objects.create(
            item=cls.item,
            batch_number='S1016-BATCH',
            quantity_received='20.00',
            quantity_remaining='20.00',
            received_by=cls.users['admin'],
        )
        cls.dental_instrument = InventoryCategory.objects.create(name='Dental Instrument', code='dental-instrument')
        cls.ogb_dent = Supplier.objects.create(name='OGB dent')

    def authenticate(self, role):
        self.client.force_authenticate(self.users[role])

    def test_permission_matrix_limits_create_and_excludes_backoffice_from_usage(self):
        self.assertTrue(has_permission(self.users['admin'], 'inventory.create'))
        for role in ('dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'):
            with self.subTest(role=role):
                self.assertFalse(has_permission(self.users[role], 'inventory.create'))
        for role in ('admin', 'dentist', 'assistant', 'receptionist', 'nurse'):
            with self.subTest(role=role):
                self.assertTrue(has_permission(self.users[role], 'inventory.usage'))
        self.assertFalse(has_permission(self.users['backoffice'], 'inventory.usage'))

    def test_admin_create_generates_category_supplier_date_sku_and_daily_sequence(self):
        self.authenticate('admin')
        with patch('inventory.models.timezone.localdate', return_value=date(2026, 8, 9)):
            first = self.client.post(
                '/api/inventory-items/',
                {
                    'name': 'First generated item',
                    'unit_of_measure': 'pack',
                    'category': self.dental_instrument.pk,
                    'default_supplier': self.ogb_dent.pk,
                },
                format='json',
            )
            receipt = self.client.post('/api/inventory-items/receipt/', {'item': first.data['id'], 'quantity': '2.00'}, format='json')
            second = self.client.post(
                '/api/inventory-items/',
                {
                    'name': 'Second generated item',
                    'unit_of_measure': 'pack',
                    'category': self.dental_instrument.pk,
                    'default_supplier': self.ogb_dent.pk,
                },
                format='json',
            )
        with patch('inventory.models.timezone.localdate', return_value=date(2026, 8, 10)):
            next_day = self.client.post(
                '/api/inventory-items/',
                {
                    'name': 'Next day generated item',
                    'unit_of_measure': 'pack',
                    'category': self.dental_instrument.pk,
                    'default_supplier': self.ogb_dent.pk,
                },
                format='json',
            )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(receipt.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(next_day.status_code, 201)
        self.assertEqual(first.data['sku'], 'DINOGD2608091')
        self.assertEqual(receipt.data['batch_number'], 'SKU260809-1')
        self.assertEqual(second.data['sku'], 'DINOGD2608092')
        self.assertEqual(next_day.data['sku'], 'DINOGD2608101')

    def test_non_admin_roles_cannot_create_inventory_items_and_denials_are_audited(self):
        for role in ('dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'):
            with self.subTest(role=role):
                self.authenticate(role)
                response = self.client.post('/api/inventory-items/', {'name': f'Denied {role}', 'unit_of_measure': 'pack'}, format='json')
                self.assertEqual(response.status_code, 403)
                self.assertFalse(InventoryItem.objects.filter(name=f'Denied {role}').exists())
                self.assertTrue(
                    AuditEvent.objects.filter(
                        user=self.users[role],
                        action='inventory_permission_denied',
                        failure_reason='missing inventory.create',
                        success=False,
                    ).exists()
                )

    def test_all_roles_except_backoffice_can_record_usage(self):
        for role in ('admin', 'dentist', 'assistant', 'receptionist', 'nurse'):
            with self.subTest(role=role):
                self.authenticate(role)
                response = self.client.post(
                    '/api/inventory-items/usage/',
                    {'item': self.item.pk, 'batch': self.batch.pk, 'quantity': '1.00', 'reason': f'Usage by {role}'},
                    format='json',
                )
                self.assertEqual(response.status_code, 200)
                self.assertTrue(StockMovement.objects.filter(item=self.item, movement_type='usage', user=self.users[role]).exists())

    def test_backoffice_usage_is_denied_and_audited(self):
        self.authenticate('backoffice')
        response = self.client.post(
            '/api/inventory-items/usage/',
            {'item': self.item.pk, 'batch': self.batch.pk, 'quantity': '1.00', 'reason': 'Backoffice denied'},
            format='json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(StockMovement.objects.filter(item=self.item, movement_type='usage', user=self.users['backoffice']).exists())
        self.assertTrue(
            AuditEvent.objects.filter(
                user=self.users['backoffice'],
                action='inventory_permission_denied',
                failure_reason='missing inventory.usage',
                success=False,
            ).exists()
        )
