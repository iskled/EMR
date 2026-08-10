from datetime import date, time, timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from appointments.models import Appointment, AppointmentType
from appointments.serializers import AppointmentDetailSerializer, AppointmentWriteSerializer
from authentication.models import User
from patients.models import Patient


class ClinicianLookupTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.scheduler = User.objects.create_user(email='scheduler@test.local', password='test', role='receptionist')
        cls.dentist_a = User.objects.create_user(email='a@test.local', password='test', role='dentist', first_name='Ada', last_name='Dentist')
        cls.dentist_b = User.objects.create_user(email='b@test.local', password='test', role='dentist', first_name='Bola', last_name='Dentist')
        cls.inactive = User.objects.create_user(email='inactive@test.local', password='test', role='dentist', is_active=False)
        cls.assistant = User.objects.create_user(email='assistant@test.local', password='test', role='assistant')
        cls.patient = Patient.objects.create(patient_code='CLINICIAN-TEST', first_name='Test', last_name='Patient', date_of_birth=date(1990, 1, 1), gender='O', phone_primary='07000000000', registered_by=cls.scheduler)
        cls.kind = AppointmentType.objects.create(name='Consultation', slug='test-consultation', default_duration=30)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.scheduler)

    def test_lookup_returns_only_active_dentists_with_stable_identity_and_names(self):
        response = self.client.get('/api/auth/dentists/')
        self.assertEqual(response.status_code, 200)
        rows = response.data['results']
        self.assertEqual([row['id'] for row in rows], [self.dentist_a.id, self.dentist_b.id])
        self.assertEqual(rows[0]['first_name'], 'Ada')
        self.assertEqual(rows[0]['last_name'], 'Dentist')
        self.assertEqual(rows[0]['full_name'], 'Ada Dentist')
        self.assertTrue(all(row['role'] == User.ROLE_CHOICES[1][0] and row['is_active'] for row in rows))
        returned = {row['email'] for row in rows}
        self.assertNotIn(self.inactive.email, returned)
        self.assertNotIn(self.assistant.email, returned)
        self.assertNotIn(self.scheduler.email, returned)

    def test_all_appointment_booking_roles_can_access_and_anonymous_is_denied(self):
        for role in ('admin', 'dentist', 'assistant', 'receptionist'):
            user = User.objects.create_user(email=f'{role}@access.test', password='test', role=role)
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get('/api/auth/dentists/').status_code, 200)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get('/api/auth/dentists/').status_code, 401)

    def test_returned_dentist_is_accepted_and_invalid_id_is_clear(self):
        tomorrow = date.today() + timedelta(days=1)
        payload = {'patient': self.patient.id, 'dentist': self.dentist_a.id, 'appointment_type': self.kind.id, 'scheduled_date': tomorrow, 'start_time': time(9), 'end_time': time(9, 30), 'duration_minutes': 30}
        request = type('Request', (), {'user': self.scheduler})()
        serializer = AppointmentWriteSerializer(data=payload, context={'request': request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        invalid = AppointmentWriteSerializer(data={**payload, 'dentist': 999999}, context={'request': request})
        self.assertFalse(invalid.is_valid())
        self.assertIn('dentist', invalid.errors)

    def test_historical_inactive_dentist_still_serializes(self):
        appointment = Appointment.objects.create(patient=self.patient, dentist=self.inactive, appointment_type=self.kind, scheduled_date=date.today(), start_time=time(9), end_time=time(9, 30), duration_minutes=30, created_by=self.scheduler)
        data = AppointmentDetailSerializer(appointment).data
        self.assertEqual(data['dentist'], self.inactive.id)
        self.assertEqual(data['dentist_name'], self.inactive.get_full_name())
