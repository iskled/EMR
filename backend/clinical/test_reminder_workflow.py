from datetime import date, time, timedelta

from rest_framework.test import APITestCase

from appointments.models import Appointment, AppointmentType
from authentication.models import User
from core.models import AuditEvent
from patients.models import Patient

from clinical.models import ClinicalNote, OrthodonticCase, RecallSchedule
from clinical.reminder_workflow import reminder_type_for_visit


class ReminderWorkflowTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email='admin@reminder.test', password='x', role='admin')
        self.dentist = User.objects.create_user(email='dentist@reminder.test', password='x', role='dentist')
        self.patient = Patient.objects.create(
            patient_code='REM-1', first_name='Recall', last_name='Patient',
            date_of_birth=date(1990, 1, 1), gender='O', phone_primary='0800',
            registered_by=self.admin,
        )
        self.kind = AppointmentType.objects.create(name='Review', slug='reminder-review', default_duration=30)
        self.client.force_authenticate(self.dentist)

    def reminder(self, status='active', reminder_type='treatment'):
        return RecallSchedule.objects.create(
            patient=self.patient, recall_type=reminder_type,
            due_date=date.today() + timedelta(days=30), interval_days=30,
            status=status, created_by=self.dentist,
        )

    def appointment(self):
        return Appointment.objects.create(
            patient=self.patient, dentist=self.dentist, appointment_type=self.kind,
            scheduled_date=date.today() + timedelta(days=30), start_time=time(9),
            end_time=time(9, 30), duration_minutes=30, created_by=self.dentist,
        )

    def test_confirmed_reminder_books_with_authoritative_metadata(self):
        reminder = self.reminder('confirmed')
        appointment = self.appointment()
        response = self.client.post(
            f'/api/recalls/{reminder.pk}/transition/',
            {'status': 'booked', 'linked_appointment': str(appointment.pk)}, format='json')
        self.assertEqual(response.status_code, 200)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, 'booked')
        self.assertEqual(reminder.linked_appointment, appointment)
        self.assertEqual(reminder.booked_by, self.dentist)
        self.assertIsNotNone(reminder.booked_at)
        self.assertTrue(AuditEvent.objects.filter(action='reminder_booked').exists())

    def test_appointment_creation_books_reminder_atomically_and_is_idempotent(self):
        reminder = self.reminder('confirmed')
        payload = {
            'patient': str(self.patient.pk), 'dentist': self.dentist.pk,
            'appointment_type': self.kind.pk,
            'scheduled_date': (date.today() + timedelta(days=30)).isoformat(),
            'start_time': '11:00', 'end_time': '11:30', 'duration_minutes': 30,
            'status': 'scheduled', 'reminder': str(reminder.pk),
        }
        first = self.client.post('/api/appointments/', payload, format='json')
        self.assertEqual(first.status_code, 201, first.data)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, 'booked')
        self.assertEqual(Appointment.objects.filter(patient=self.patient, start_time=time(11)).count(), 1)
        second = self.client.post('/api/appointments/', payload, format='json')
        self.assertEqual(second.status_code, 201, second.data)
        self.assertEqual(Appointment.objects.filter(patient=self.patient, start_time=time(11)).count(), 1)

    def test_contact_reschedule_cancel_and_cancelled_archive(self):
        reminder = self.reminder('active')
        self.assertEqual(self.client.post(f'/api/recalls/{reminder.pk}/contact/',
            {'method': 'phone', 'outcome': 'answered', 'notes': 'First'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(f'/api/recalls/{reminder.pk}/contact/',
            {'method': 'sms', 'outcome': 'sent', 'notes': 'Second'}, format='json').status_code, 200)
        reminder.refresh_from_db()
        self.assertEqual(len(reminder.contact_history), 2)
        new_due = reminder.due_date + timedelta(days=7)
        self.assertEqual(self.client.post(f'/api/recalls/{reminder.pk}/reschedule/',
            {'new_due_date': new_due.isoformat(), 'reason': 'Patient request'}, format='json').status_code, 200)
        reminder.refresh_from_db()
        self.assertEqual(reminder.due_date, new_due)
        self.assertEqual(len(reminder.reschedule_history), 1)
        self.assertEqual(self.client.post(f'/api/recalls/{reminder.pk}/cancel/',
            {'reason': 'No longer required'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(f'/api/recalls/{reminder.pk}/archive/',
            {'reason': 'Closed'}, format='json').status_code, 200)

    def test_invalid_transition_and_duplicate_are_rejected(self):
        reminder = self.reminder('active')
        skipped = self.client.post(
            f'/api/recalls/{reminder.pk}/transition/', {'status': 'booked'}, format='json')
        self.assertEqual(skipped.status_code, 400)
        duplicate = self.client.post('/api/recalls/', {
            'patient': str(self.patient.pk), 'recall_type': reminder.recall_type,
            'due_date': reminder.due_date, 'interval_days': 30, 'preset': 'custom',
        }, format='json')
        self.assertEqual(duplicate.status_code, 400)

    def test_completion_can_generate_next_reminder(self):
        reminder = self.reminder('booked')
        next_due = date.today() + timedelta(days=180)
        response = self.client.post(
            f'/api/recalls/{reminder.pk}/complete/',
            {'next_due_date': next_due.isoformat(), 'next_type': 'treatment'}, format='json')
        self.assertEqual(response.status_code, 200)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, 'completed')
        self.assertIsNotNone(reminder.completed_at)
        self.assertTrue(RecallSchedule.objects.filter(
            patient=self.patient, due_date=next_due, status='active').exists())

    def test_completed_reminder_archives_and_admin_restores(self):
        reminder = self.reminder('completed')
        archived = self.client.post(f'/api/recalls/{reminder.pk}/archive/', {'reason': 'queue cleanup'}, format='json')
        self.assertEqual(archived.status_code, 200)
        self.assertFalse(RecallSchedule.objects.filter(pk=reminder.pk, archived_at__isnull=True).exists())
        denied = self.client.post(f'/api/recalls/{reminder.pk}/restore/', format='json')
        self.assertEqual(denied.status_code, 403)
        self.client.force_authenticate(self.admin)
        restored = self.client.post(f'/api/recalls/{reminder.pk}/restore/', format='json')
        self.assertEqual(restored.status_code, 200)
        reminder.refresh_from_db()
        self.assertIsNone(reminder.archived_at)
        self.assertIsNotNone(reminder.restored_at)

    def test_orthodontic_visit_immediately_creates_review_reminder(self):
        case = OrthodonticCase.objects.create(
            patient=self.patient, start_date=date.today(), diagnosis='Class II')
        next_review = date.today() + timedelta(days=42)
        response = self.client.post('/api/orthodontic-visits/', {
            'ortho_case': case.pk, 'dentist': self.dentist.pk,
            'visit_date': date.today(), 'visit_type': 'adjustment',
            'next_review_days': 42, 'next_review_date': next_review,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(RecallSchedule.objects.filter(
            patient=self.patient, recall_type='orthodontic',
            due_date=next_review, status='active').exists())

    def test_shared_visit_type_mapping(self):
        self.assertEqual(reminder_type_for_visit('treatment', 'Root canal completed'), 'root_canal')
        self.assertEqual(reminder_type_for_visit('general', 'Root canal completed'), 'root_canal')
        self.assertEqual(reminder_type_for_visit('follow_up'), 'follow_up')
