from datetime import date, time

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from patients.models import Patient
from .models import Appointment, AppointmentType

User = get_user_model()


class NoShowAppointmentRetentionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='apt-admin@test.local', password='test', role='admin')
        cls.dentist = User.objects.create_user(email='apt-dentist@test.local', password='test', role='dentist')
        cls.other_dentist = User.objects.create_user(email='apt-other@test.local', password='test', role='dentist')
        cls.receptionist = User.objects.create_user(email='apt-reception@test.local', password='test', role='receptionist')
        cls.patient = Patient.objects.create(patient_code='APT-001', first_name='Test', last_name='Patient',
                                             date_of_birth=date(1990, 1, 1), gender='F', phone_primary='08000000000')
        cls.kind = AppointmentType.objects.create(name='Review', slug='retention-review', default_duration=30)

    def make_appointment(self, status='no_show', dentist=None):
        return Appointment.objects.create(patient=self.patient, dentist=dentist or self.dentist,
            appointment_type=self.kind, scheduled_date=date.today(), start_time=time(9), end_time=time(9, 30),
            duration_minutes=30, status=status, created_by=self.admin)

    def test_receptionist_can_archive_no_show_and_normal_list_hides_it(self):
        appointment = self.make_appointment()
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(f'/api/appointments/{appointment.pk}/archive/', {'reason': 'Missed visit'})
        self.assertEqual(response.status_code, 200, response.data)
        appointment.refresh_from_db()
        self.assertIsNotNone(appointment.archived_at)
        self.assertEqual(appointment.archived_by, self.receptionist)
        ids = [str(item['id']) for item in self.client.get('/api/appointments/').data['results']]
        self.assertNotIn(str(appointment.pk), ids)

    def test_authorized_staff_can_delete_no_show_with_confirmation(self):
        appointment = self.make_appointment()
        self.client.force_authenticate(self.receptionist)
        self.assertEqual(self.client.delete(f'/api/appointments/{appointment.pk}/', {'confirmation': 'DELETE'}, format='json').status_code, 204)
        self.assertFalse(Appointment.objects.filter(pk=appointment.pk).exists())

    def test_non_no_show_can_be_archived_or_deleted(self):
        appointment = self.make_appointment('scheduled')
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(f'/api/appointments/{appointment.pk}/archive/').status_code, 200)
        appointment.refresh_from_db()
        self.assertIsNotNone(appointment.archived_at)
        appointment.archived_at = None
        appointment.save(update_fields=['archived_at'])
        self.assertEqual(self.client.delete(f'/api/appointments/{appointment.pk}/', {'confirmation': 'DELETE'}, format='json').status_code, 204)

    def test_dentist_cannot_remove_another_dentists_no_show(self):
        appointment = self.make_appointment(dentist=self.other_dentist)
        self.client.force_authenticate(self.dentist)
        self.assertEqual(self.client.post(f'/api/appointments/{appointment.pk}/archive/').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/appointments/{appointment.pk}/', {'confirmation': 'DELETE'}, format='json').status_code, 404)
