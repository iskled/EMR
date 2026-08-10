from datetime import date, time

from django.test import TestCase
from rest_framework.test import APIClient

from appointments.models import Appointment, AppointmentType
from authentication.models import PasswordHistory, User
from clinical.models import ClinicalNote, OrthodonticCase, OrthodonticVisit, RecallSchedule, TreatmentPlan
from core.models import AuditEvent, SecurityAlert
from patients.models import Patient


class DentistManagementTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='admin@dm.test', password='AdminPass!2026', role='admin')
        cls.nurse = User.objects.create_user(email='nurse@dm.test', password='NursePass!2026', role='nurse', can_manage_dentists=True)
        cls.ordinary_nurse = User.objects.create_user(email='ordinary@dm.test', password='NursePass!2026', role='nurse')
        cls.dentist = User.objects.create_user(email='dentist@dm.test', password='DentistPass!2026', role='dentist', first_name='Existing', last_name='Dentist')
        PasswordHistory.objects.create(user=cls.dentist, password_hash=cls.dentist.password)
        cls.assistant = User.objects.create_user(email='assistant@dm.test', password='AssistantPass!2026', role='assistant')
        cls.receptionist = User.objects.create_user(email='reception@dm.test', password='ReceptionPass!2026', role='receptionist')

    def setUp(self):
        self.client = APIClient()

    def auth(self, user):
        self.client.force_authenticate(user)

    def test_admin_and_authorised_nurse_can_list_but_other_roles_cannot(self):
        for user in (self.admin, self.nurse):
            self.auth(user)
            self.assertEqual(self.client.get('/api/auth/dentist-accounts/').status_code, 200)
        for user in (self.ordinary_nurse, self.dentist, self.assistant, self.receptionist):
            self.auth(user)
            self.assertEqual(self.client.get('/api/auth/dentist-accounts/').status_code, 403)

    def test_nurse_creates_only_dentist_without_password_exposure(self):
        self.auth(self.nurse)
        response = self.client.post('/api/auth/dentist-accounts/', {'first_name':'Test','last_name':'Dentist','email':'test.dentist@clinic.com','temporary_password':'SecureDentist!2026','role':'admin'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        created = User.objects.get(email='test.dentist@clinic.com')
        self.assertEqual(created.role, 'dentist')
        self.assertTrue(created.must_change_password)
        self.assertNotIn('password', response.data)
        self.assertNotIn('temporary_password', response.data)
        self.assertTrue(AuditEvent.objects.filter(action='dentist_created', resource_id=str(created.pk)).exists())

    def test_duplicate_email_is_clear(self):
        self.auth(self.admin)
        response = self.client.post('/api/auth/dentist-accounts/', {'first_name':'Duplicate','last_name':'Dentist','email':self.dentist.email,'temporary_password':'SecureDentist!2026'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('An account already exists', str(response.data))

    def test_role_cannot_be_changed_through_specialised_endpoint(self):
        self.auth(self.nurse)
        response = self.client.patch(f'/api/auth/dentist-accounts/{self.dentist.pk}/', {'role':'admin','first_name':'Updated'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.dentist.refresh_from_db()
        self.assertEqual(self.dentist.role, 'dentist')

    def test_deactivate_removes_from_selector_blocks_login_and_reactivate_restores(self):
        self.auth(self.nurse)
        response = self.client.post(f'/api/auth/dentist-accounts/{self.dentist.pk}/deactivate/', {'reason':'Leave'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.get(pk=self.dentist.pk).is_active)
        self.assertNotIn(self.dentist.pk, [row['id'] for row in self.client.get('/api/auth/dentists/').data['results']])
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post('/api/auth/login/', {'email':self.dentist.email,'password':'DentistPass!2026'}).status_code, 401)
        self.auth(self.nurse)
        self.assertEqual(self.client.post(f'/api/auth/dentist-accounts/{self.dentist.pk}/reactivate/', {}).status_code, 200)
        self.assertIn(self.dentist.pk, [row['id'] for row in self.client.get('/api/auth/dentists/').data['results']])

    def test_dependencies_prevent_delete_and_archive_preserves_appointment(self):
        patient = Patient.objects.create(patient_code='DM-1', first_name='Historical', last_name='Patient', date_of_birth=date(1990,1,1), gender='O', phone_primary='0700', registered_by=self.admin)
        kind = AppointmentType.objects.create(name='DM Consult', slug='dm-consult', default_duration=30)
        appointment = Appointment.objects.create(patient=patient, dentist=self.dentist, appointment_type=kind, scheduled_date=date.today(), start_time=time(9), end_time=time(9,30), duration_minutes=30, created_by=self.admin)
        note = ClinicalNote.objects.create(patient=patient, dentist=self.dentist, note_date=date.today(), treatment_scope='whole_mouth')
        TreatmentPlan.objects.create(patient=patient, dentist=self.dentist, title='Plan')
        ortho_case = OrthodonticCase.objects.create(patient=patient, start_date=date.today())
        OrthodonticVisit.objects.create(ortho_case=ortho_case, dentist=self.dentist, visit_date=date.today())
        RecallSchedule.objects.create(patient=patient, clinical_note=note, recall_type='follow_up', due_date=date.today(), interval_days=30, created_by=self.admin)
        self.auth(self.nurse)
        deps = self.client.get(f'/api/auth/dentist-accounts/{self.dentist.pk}/dependencies/').data
        self.assertEqual(deps['counts']['appointments'], 1)
        self.assertEqual(deps['counts']['clinical_notes'], 1)
        self.assertEqual(deps['counts']['treatment_plans'], 1)
        self.assertEqual(deps['counts']['orthodontic_visits'], 1)
        self.assertEqual(deps['counts']['recalls'], 1)
        self.assertEqual(self.client.delete(f'/api/auth/dentist-accounts/{self.dentist.pk}/').status_code, 409)
        self.assertEqual(self.client.post(f'/api/auth/dentist-accounts/{self.dentist.pk}/archive/', {'reason':'Retired'}, format='json').status_code, 200)
        appointment.refresh_from_db()
        self.assertEqual(appointment.dentist.get_full_name(), 'Existing Dentist')
        note.refresh_from_db()
        self.assertEqual(note.dentist.get_full_name(), 'Existing Dentist')
        self.assertTrue(SecurityAlert.objects.filter(alert_type='dentist_account_management', user=self.dentist).exists())

    def test_nurse_does_not_gain_global_admin_access(self):
        self.auth(self.nurse)
        self.assertEqual(self.client.get('/api/auth/users/').status_code, 403)
        self.assertEqual(self.client.get('/api/security-alerts/').status_code, 403)

    def test_nurse_can_load_patient_reference_data_for_appointment_workflow(self):
        self.auth(self.nurse)
        self.assertEqual(self.client.get('/api/patients/').status_code, 200)

    def test_reset_password_honours_history_and_does_not_return_secret(self):
        self.auth(self.nurse)
        reused = self.client.post(
            f'/api/auth/dentist-accounts/{self.dentist.pk}/reset-password/',
            {'temporary_password': 'DentistPass!2026'},
            format='json',
        )
        self.assertEqual(reused.status_code, 400)
        response = self.client.post(
            f'/api/auth/dentist-accounts/{self.dentist.pk}/reset-password/',
            {'temporary_password': 'NewDentistPass!2026'},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('temporary_password', response.data)
        self.assertNotIn('password', response.data)

    def test_inactive_dentist_rejected_for_new_clinical_and_orthodontic_work(self):
        patient = Patient.objects.create(patient_code='DM-2', first_name='Selector', last_name='Patient', date_of_birth=date(1990,1,1), gender='O', phone_primary='0700', registered_by=self.admin)
        self.dentist.is_active = False
        self.dentist.save(update_fields=['is_active'])
        self.auth(self.admin)
        note = self.client.post('/api/clinical-notes/', {'patient': str(patient.pk), 'dentist': self.dentist.pk, 'note_type': 'treatment', 'note_date': str(date.today()), 'treatment_scope': 'whole_mouth'}, format='json')
        self.assertEqual(note.status_code, 400)
        plan = self.client.post('/api/treatment-plans/', {'patient': str(patient.pk), 'dentist': self.dentist.pk, 'title': 'Inactive Plan'}, format='json')
        self.assertEqual(plan.status_code, 400)
        ortho_case = OrthodonticCase.objects.create(patient=patient, start_date=date.today())
        visit = self.client.post('/api/orthodontic-visits/', {'ortho_case': ortho_case.pk, 'dentist': self.dentist.pk, 'visit_date': str(date.today()), 'visit_type': 'review'}, format='json')
        self.assertEqual(visit.status_code, 400)
