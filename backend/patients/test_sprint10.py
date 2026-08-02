from datetime import date, time, timedelta
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from appointments.models import Appointment, AppointmentType
from authentication.models import User
from clinical.models import ClinicalNote, RecallSchedule
from patients.models import Patient

class Sprint10PatientWorkspaceTests(APITestCase):
    def setUp(self):
        self.admin=User.objects.create_user(email='admin@s10.test',password='unused',role='admin')
        self.dentist=User.objects.create_user(email='dentist@s10.test',password='unused',role='dentist')
        self.reception=User.objects.create_user(email='reception@s10.test',password='unused',role='receptionist')
        self.patient=Patient.objects.create(patient_code='S10-1',first_name='Sprint',last_name='Ten',date_of_birth=date(1990,1,1),gender='O',phone_primary='000',registered_by=self.admin)

    def auth(self,user): self.client.force_authenticate(user)

    def test_whole_mouth_note_uses_explicit_scope_and_empty_teeth(self):
        self.auth(self.dentist); response=self.client.post('/api/clinical-notes/',{'patient':str(self.patient.pk),'dentist':self.dentist.pk,'note_type':'treatment','note_date':date.today(),'treatment_scope':'whole_mouth','tooth_numbers':[11,12]},format='json')
        self.assertEqual(response.status_code,201); note=ClinicalNote.objects.get(pk=response.data['id']); self.assertEqual(note.treatment_scope,'whole_mouth'); self.assertEqual(note.tooth_numbers,[])

    def test_recall_before_visit_is_rejected(self):
        note=ClinicalNote.objects.create(patient=self.patient,dentist=self.dentist,note_date=date.today(),treatment_scope='specific_teeth')
        self.auth(self.dentist); response=self.client.post('/api/recalls/',{'patient':str(self.patient.pk),'clinical_note':str(note.pk),'recall_type':'preventive','due_date':date.today()-timedelta(days=1),'interval_days':1,'preset':'custom'},format='json')
        self.assertEqual(response.status_code,400)

    def test_secure_document_validation_and_download(self):
        self.auth(self.admin); upload=SimpleUploadedFile('consent.pdf',b'%PDF-1.4\n%%EOF',content_type='application/pdf'); created=self.client.post('/api/patient-documents/',{'patient':str(self.patient.pk),'document_type':'consent','title':'Consent','file':upload},format='multipart')
        self.assertEqual(created.status_code,201); downloaded=self.client.get(f"/api/patient-documents/{created.data['id']}/download/"); self.assertEqual(downloaded.status_code,200); self.assertIn('attachment',downloaded['Content-Disposition'])

    def test_invalid_document_type_is_rejected(self):
        self.auth(self.admin); upload=SimpleUploadedFile('payload.exe',b'bad',content_type='application/octet-stream'); response=self.client.post('/api/patient-documents/',{'patient':str(self.patient.pk),'document_type':'other','title':'Bad','file':upload},format='multipart'); self.assertEqual(response.status_code,400)

    def test_summary_selects_completed_visit_and_excludes_no_show(self):
        kind=AppointmentType.objects.create(name='Review',slug='s10-review',default_duration=30)
        Appointment.objects.create(patient=self.patient,dentist=self.dentist,appointment_type=kind,scheduled_date=date.today()-timedelta(days=2),start_time=time(9),end_time=time(9,30),duration_minutes=30,status='completed',created_by=self.admin)
        Appointment.objects.create(patient=self.patient,dentist=self.dentist,appointment_type=kind,scheduled_date=date.today()-timedelta(days=1),start_time=time(9),end_time=time(9,30),duration_minutes=30,status='no_show',created_by=self.admin)
        self.auth(self.dentist); response=self.client.get(f'/api/patients/{self.patient.pk}/summary/'); self.assertEqual(response.status_code,200); self.assertEqual(response.data['last_visit']['status'],'completed')

    def test_receptionist_summary_hides_clinical_note(self):
        ClinicalNote.objects.create(patient=self.patient,dentist=self.dentist,note_date=date.today(),diagnosis='Sensitive')
        self.auth(self.reception); response=self.client.get(f'/api/patients/{self.patient.pk}/summary/'); self.assertEqual(response.status_code,200); self.assertIsNone(response.data['latest_note'])

    def test_valid_patient_creation_generates_code_and_audits(self):
        self.auth(self.reception); response=self.client.post('/api/patients/',{'first_name':'New','last_name':'Patient','date_of_birth':'2000-01-02','gender':'F','phone_primary':'08030000001','email':'new@example.test'},format='json')
        self.assertEqual(response.status_code,201); self.assertEqual(response.data['patient_code'],f'{date.today():%Y%m%d}01'); self.assertEqual(Patient.objects.get(pk=response.data['id']).registered_by,self.reception)

    def test_patient_codes_are_daily_sequential_and_existing_codes_are_preserved(self):
        from patients.utils import generate_patient_code
        self.assertEqual(generate_patient_code(date(2026,7,17)),'2026071701'); self.assertEqual(generate_patient_code(date(2026,7,17)),'2026071702'); self.assertEqual(generate_patient_code(date(2026,7,18)),'2026071801'); self.patient.refresh_from_db(); self.assertEqual(self.patient.patient_code,'S10-1')

    def test_patient_creation_required_fields_and_duplicates(self):
        self.auth(self.reception); missing=self.client.post('/api/patients/',{},format='json'); self.assertEqual(missing.status_code,400); self.assertIn('first_name',missing.data)
        duplicate=self.client.post('/api/patients/',{'first_name':'Copy','last_name':'Patient','date_of_birth':'2000-01-02','gender':'F','phone_primary':'000'},format='json'); self.assertEqual(duplicate.status_code,400); self.assertIn('phone_primary',duplicate.data)

    def test_patient_creation_requires_authentication(self):
        self.client.force_authenticate(user=None); response=self.client.post('/api/patients/',{'first_name':'No','last_name':'Access'},format='json'); self.assertEqual(response.status_code,401)

    def test_clinical_note_accepts_system_or_external_dentist_but_not_neither(self):
        self.auth(self.dentist); base={'patient':str(self.patient.pk),'note_type':'treatment','note_date':str(date.today()),'treatment_scope':'whole_mouth'}
        system=self.client.post('/api/clinical-notes/',{**base,'dentist':str(self.dentist.pk)},format='json'); self.assertEqual(system.status_code,201); self.assertEqual(ClinicalNote.objects.get(pk=system.data['id']).dentist,self.dentist)
        external=self.client.post('/api/clinical-notes/',{**base,'other_dentist_name':'Dr External'},format='json'); self.assertEqual(external.status_code,201); self.assertEqual(ClinicalNote.objects.get(pk=external.data['id']).other_dentist_name,'Dr External')
        neither=self.client.post('/api/clinical-notes/',base,format='json'); self.assertEqual(neither.status_code,400); self.assertIn('dentist',neither.data)
