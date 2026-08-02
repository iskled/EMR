from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import AuditEvent, ClinicSettings


class ClinicSettingsApiTests(TestCase):
    endpoint = "/api/settings/clinic/"

    def setUp(self):
        user_model = get_user_model()
        self.admin = user_model.objects.create_user(
            email="branding.admin@example.test", password="test-password", role="admin"
        )
        self.dentist = user_model.objects.create_user(
            email="branding.dentist@example.test", password="test-password", role="dentist"
        )
        self.client = APIClient()

    def test_authenticated_read_creates_singleton_defaults(self):
        self.client.force_authenticate(self.dentist)

        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["clinic_name"], "Beyond Smile Dental Clinic")
        self.assertEqual(response.data["currency"], "NGN")
        self.assertEqual(ClinicSettings.objects.count(), 1)

    def test_only_admin_can_update_branding(self):
        self.client.force_authenticate(self.dentist)
        denied = self.client.patch(self.endpoint, {"clinic_name": "Denied"}, format="json")
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.admin)
        updated = self.client.patch(
            self.endpoint,
            {"clinic_name": "Beyond Smile Test Clinic", "primary_colour": "#112233"},
            format="json",
        )

        self.assertEqual(updated.status_code, 200)
        self.assertEqual(ClinicSettings.objects.get().clinic_name, "Beyond Smile Test Clinic")
        self.assertEqual(ClinicSettings.objects.count(), 1)
        self.assertTrue(
            AuditEvent.objects.filter(action="clinic_branding_updated").exists()
        )

    def test_invalid_colour_is_rejected_without_changing_settings(self):
        settings = ClinicSettings.objects.create(clinic_name="Beyond Smile Dental Clinic")
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            self.endpoint, {"primary_colour": "blue"}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        settings.refresh_from_db()
        self.assertEqual(settings.primary_colour, "#2563eb")
