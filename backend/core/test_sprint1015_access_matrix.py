from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from appointments.models import Appointment, AppointmentType
from clinical.models import OrthodonticCase
from core.models import AuditEvent
from core.permissions import has_permission, permission_matrix
from inventory.models import InventoryBatch, InventoryCategory, InventoryItem, InventoryLocation, Supplier, StockMovement
from patients.models import Patient
from tasks.models import Task


User = get_user_model()


class Sprint1015AccessMatrixTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            email='sprint1015.admin@test.local',
            password='Sprint1015!Admin',
            role='admin',
        )
        cls.backoffice = User.objects.create_user(
            email='sprint1015.backoffice@test.local',
            password='Sprint1015!Backoffice',
            role='backoffice',
        )
        cls.dentist = User.objects.create_user(
            email='sprint1015.dentist@test.local',
            password='Sprint1015!Dentist',
            role='dentist',
            first_name='Ada',
            last_name='Dentist',
        )
        cls.patient = Patient.objects.create(
            patient_code='S1015-001',
            first_name='Backoffice',
            last_name='Patient',
            date_of_birth='1990-01-01',
            gender='F',
            phone_primary='08000000001',
            registered_by=cls.admin,
        )
        cls.appointment_type = AppointmentType.objects.create(
            name='Sprint 10.15 Review',
            slug='sprint-1015-review',
            default_duration=30,
        )
        cls.inventory_category = InventoryCategory.objects.create(name='Sprint 1015 Supplies', code='sprint-1015-supplies')
        cls.inventory_location = InventoryLocation.objects.create(name='Sprint 1015 Store', code='sprint-1015-store')
        cls.supplier = Supplier.objects.create(name='Sprint 1015 Supplier')
        cls.inventory_item = InventoryItem.objects.create(
            name='Sprint 1015 Bracket Kit',
            sku='S1015-BRACKET',
            category=cls.inventory_category,
            storage_location=cls.inventory_location,
            default_supplier=cls.supplier,
            unit_cost='10.00',
        )
        cls.inventory_batch = InventoryBatch.objects.create(
            item=cls.inventory_item,
            batch_number='S1015-BATCH',
            quantity_received='5.00',
            quantity_remaining='5.00',
            supplier=cls.supplier,
            storage_location=cls.inventory_location,
            received_by=cls.admin,
        )
        cls.task = Task.objects.create(
            title='Sprint 10.15 assigned task',
            status='pending_acceptance',
            assigned_user=cls.backoffice,
            created_by=cls.admin,
        )
        cls.ortho_case = OrthodonticCase.objects.create(
            patient=cls.patient,
            diagnosis='Crowding',
            start_date=date.today(),
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_role_matrix_admin_and_backoffice_permissions(self):
        self.assertTrue(has_permission(self.admin, 'users.manage'))
        self.assertTrue(has_permission(self.admin, 'security.view'))
        self.assertTrue(has_permission(self.admin, 'inventory.delete'))
        self.assertTrue(has_permission(self.backoffice, 'dashboard.view'))
        self.assertTrue(has_permission(self.backoffice, 'patients.write'))
        self.assertTrue(has_permission(self.backoffice, 'appointments.write'))
        self.assertTrue(has_permission(self.backoffice, 'orthodontics.view'))
        self.assertFalse(has_permission(self.backoffice, 'inventory.create'))
        self.assertTrue(has_permission(self.backoffice, 'inventory.receive'))
        self.assertTrue(has_permission(self.backoffice, 'tasks.write'))
        self.assertFalse(has_permission(self.backoffice, 'tasks.create'))
        self.assertFalse(has_permission(self.backoffice, 'tasks.assign'))
        self.assertFalse(has_permission(self.backoffice, 'inventory.usage'))
        self.assertFalse(has_permission(self.backoffice, 'inventory.adjust_decrease'))
        self.assertFalse(has_permission(self.backoffice, 'inventory.delete'))
        self.assertFalse(has_permission(self.backoffice, 'settings.view'))
        self.assertFalse(has_permission(self.backoffice, 'users.manage'))
        self.assertFalse(has_permission(self.backoffice, 'security.view'))
        self.assertFalse(has_permission(self.backoffice, 'audit.view'))
        self.assertTrue(any(row['permission'] == 'tasks.view' and row['backoffice'] for row in permission_matrix()))

    def test_backoffice_direct_denials_are_audited(self):
        self.authenticate(self.backoffice)
        endpoints = [
            '/api/auth/users/',
            '/api/auth/dentist-accounts/',
            '/api/security-alerts/',
            '/api/audit-events/',
        ]
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, 403)
        settings_response = self.client.patch('/api/settings/clinic/', {'clinic_name': 'Denied'}, format='json')
        self.assertEqual(settings_response.status_code, 403)
        self.assertTrue(AuditEvent.objects.filter(user=self.backoffice, action='access_denied', success=False).exists())
        self.assertTrue(AuditEvent.objects.filter(user=self.backoffice, action='dentist_management_denied', success=False).exists())

    def test_backoffice_can_create_patient_and_appointment(self):
        self.authenticate(self.backoffice)
        patient_response = self.client.post(
            '/api/patients/',
            {
                'patient_code': 'S1015-002',
                'first_name': 'Created',
                'last_name': 'Patient',
                'date_of_birth': '1995-05-05',
                'gender': 'M',
                'phone_primary': '08000000002',
            },
            format='json',
        )
        self.assertEqual(patient_response.status_code, 201)
        appointment_date = timezone.localdate() + timedelta(days=30)
        appointment_response = self.client.post(
            '/api/appointments/',
            {
                'patient': str(self.patient.pk),
                'dentist': self.dentist.pk,
                'appointment_type': self.appointment_type.pk,
                'scheduled_date': appointment_date.isoformat(),
                'start_time': '09:00',
                'end_time': '09:30',
                'duration_minutes': 30,
                'chief_complaint': 'Orthodontic scheduling',
            },
            format='json',
        )
        self.assertEqual(appointment_response.status_code, 201)
        appointment = Appointment.objects.get(patient=self.patient, scheduled_date=appointment_date, start_time=time(9, 0))
        status_response = self.client.patch(
            f'/api/appointments/{appointment.pk}/status/',
            {'status': 'cancelled', 'cancellation_reason': 'Patient requested reschedule'},
            format='json',
        )
        self.assertEqual(status_response.status_code, 200)

    def test_backoffice_can_view_orthodontics_but_not_general_clinical_notes(self):
        self.authenticate(self.backoffice)
        ortho_response = self.client.get('/api/orthodontic-cases/')
        notes_response = self.client.get('/api/clinical-notes/')
        self.assertEqual(ortho_response.status_code, 200)
        self.assertEqual(notes_response.status_code, 403)

    def test_backoffice_inventory_create_denied_receive_allowed_destructive_denied(self):
        self.authenticate(self.backoffice)
        create_response = self.client.post(
            '/api/inventory-items/',
            {
                'name': 'Sprint 1015 Elastics',
                'category': self.inventory_category.pk,
                'storage_location': self.inventory_location.pk,
                'default_supplier': self.supplier.pk,
                'unit_of_measure': 'pack',
                'unit_cost': '3.50',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, 403)
        receipt_response = self.client.post(
            '/api/inventory-items/receipt/',
            {
                'item': self.inventory_item.pk,
                'batch_number': 'S1015-RECEIPT',
                'quantity': '4.00',
                'supplier': self.supplier.pk,
                'storage_location': self.inventory_location.pk,
                'receipt_reference': 'S1015-RCPT',
            },
            format='json',
        )
        adjustment_response = self.client.post(
            '/api/inventory-items/adjustment/',
            {
                'batch': self.inventory_batch.pk,
                'quantity_delta': '-1.00',
                'adjustment_type': 'adjustment',
                'reason': 'Denied destructive reduction',
            },
            format='json',
        )
        usage_response = self.client.post(
            '/api/inventory-items/usage/',
            {'item': self.inventory_item.pk, 'quantity': '1.00', 'reason': 'Denied clinical usage'},
            format='json',
        )
        delete_response = self.client.delete(f'/api/inventory-items/{self.inventory_item.pk}/')
        self.assertEqual(receipt_response.status_code, 201)
        self.assertEqual(adjustment_response.status_code, 403)
        self.assertEqual(usage_response.status_code, 403)
        self.assertEqual(delete_response.status_code, 403)
        self.assertTrue(StockMovement.objects.filter(item=self.inventory_item, movement_type='receipt', user=self.backoffice).exists())
        self.assertTrue(AuditEvent.objects.filter(user=self.backoffice, action='inventory_permission_denied', success=False).exists())

    def test_backoffice_task_execution_but_not_creation_or_admin_fields(self):
        self.authenticate(self.backoffice)
        create_response = self.client.post('/api/tasks/', {'title': 'Denied task'}, format='json')
        list_response = self.client.get('/api/tasks/')
        accept_response = self.client.post(f'/api/tasks/{self.task.pk}/accept/', {}, format='json')
        start_response = self.client.post(f'/api/tasks/{self.task.pk}/start-work/', {'note': 'Started'}, format='json')
        update_response = self.client.patch(f'/api/tasks/{self.task.pk}/', {'title': 'Edited by backoffice'}, format='json')
        delete_response = self.client.delete(f'/api/tasks/{self.task.pk}/')
        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(accept_response.status_code, 200)
        self.assertEqual(start_response.status_code, 200)
        self.assertEqual(update_response.status_code, 403)
        self.assertEqual(delete_response.status_code, 403)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'in_progress')
        self.assertEqual(self.task.title, 'Sprint 10.15 assigned task')
        self.assertTrue(AuditEvent.objects.filter(user=self.backoffice, action='task_creation_denied', success=False).exists())

    def test_backoffice_reports_view_allowed_export_denied(self):
        self.authenticate(self.backoffice)
        view_response = self.client.get('/api/reports/appointments/')
        export_response = self.client.get('/api/reports/appointments/export/csv/')
        self.assertIn(view_response.status_code, (200, 404))
        self.assertEqual(export_response.status_code, 403)
        self.assertTrue(AuditEvent.objects.filter(user=self.backoffice, action='report_export_denied', success=False).exists())
