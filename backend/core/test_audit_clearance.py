from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .audit_service import audit_event
from .models import AuditClearance, AuditEvent

User = get_user_model()


class AuditClearanceTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='audit-admin@test.local', password='test', role='admin')
        cls.staff = User.objects.create_user(email='audit-staff@test.local', password='test', role='assistant')

    def test_non_admin_cannot_view_or_clear_audit_logs(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get('/api/audit-events/').status_code, 403)
        self.assertEqual(self.client.post('/api/audit-events/clear/', {'confirmation': 'CLEAR'}).status_code, 403)

    def test_admin_clears_active_view_without_deleting_append_only_events(self):
        audit_event('test_event', 'Test', user=self.admin, source_module='test')
        before = AuditEvent.objects.count()
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/audit-events/clear/', {'confirmation': 'CLEAR'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertGreaterEqual(AuditEvent.objects.count(), before)
        self.assertTrue(AuditClearance.objects.filter(cleared_by=self.admin).exists())
        listed = self.client.get('/api/audit-events/')
        self.assertEqual(listed.data['count'], 0)

    def test_clear_requires_explicit_confirmation(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post('/api/audit-events/clear/', {}).status_code, 400)
