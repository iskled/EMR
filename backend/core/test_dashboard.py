from django.urls import reverse
from rest_framework.test import APITestCase

from authentication.models import User


class DashboardAccessTests(APITestCase):
    def user(self, role):
        return User.objects.create_user(email=f'{role}@example.test', password='not-used', role=role)

    def dashboard(self, role):
        self.client.force_authenticate(self.user(role))
        return self.client.get(reverse('dashboard'))

    def test_requires_authentication(self):
        self.assertEqual(self.client.get(reverse('dashboard')).status_code, 401)

    def test_admin_receives_security_and_practice_metrics(self):
        response = self.dashboard('admin')
        self.assertEqual(response.status_code, 200)
        self.assertIn('security', response.data)
        self.assertIn('active_patients', response.data['metrics'])

    def test_dentist_receives_clinical_but_not_security(self):
        response = self.dashboard('dentist')
        self.assertEqual(response.status_code, 200)
        self.assertIn('clinical', response.data)
        self.assertNotIn('security', response.data)
        self.assertNotIn('staff_workload', response.data)

    def test_assistant_receives_inventory_without_security(self):
        response = self.dashboard('assistant')
        self.assertEqual(response.status_code, 200)
        self.assertIn('inventory', response.data)
        self.assertNotIn('security', response.data)

    def test_receptionist_does_not_receive_sensitive_sections(self):
        response = self.dashboard('receptionist')
        self.assertEqual(response.status_code, 200)
        for section in ('clinical', 'orthodontics', 'inventory', 'security', 'staff_workload'):
            self.assertNotIn(section, response.data)

    def test_unknown_role_is_forbidden(self):
        response = self.dashboard('contractor')
        self.assertEqual(response.status_code, 403)
