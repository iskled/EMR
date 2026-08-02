from datetime import date, timedelta

from rest_framework.test import APITestCase

from authentication.models import User
from core.models import AuditEvent
from patients.models import Patient
from clinical.models import OrthodonticCase, OrthodonticVisit, RecallSchedule, ToothChart, ToothRecord


class Sprint109ClinicalTests(APITestCase):
    def setUp(self):
        self.dentist = User.objects.create_user(email='s109@dentist.test', password='x', role='dentist')
        self.inactive = User.objects.create_user(email='old@dentist.test', password='x', role='dentist', is_active=False)
        self.patient = Patient.objects.create(
            patient_code='S109-1', first_name='Clinical', last_name='Patient',
            date_of_birth=date(1990, 1, 1), gender='O', phone_primary='08001',
            registered_by=self.dentist,
        )
        self.client.force_authenticate(self.dentist)

    def test_chart_returns_exact_permanent_dentition_and_preserves_findings(self):
        chart = ToothChart.objects.create(patient=self.patient, created_by=self.dentist)
        ToothRecord.objects.create(chart=chart, tooth_number=44, condition='caries',
                                   pocket_depth={'B': 4}, surface_conditions={'O': 'caries'})
        response = self.client.get(f'/api/tooth-charts/{chart.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['teeth']), 32)
        self.assertEqual([t['tooth_number'] for t in response.data['teeth'][:16]],
                         [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28])
        saved = self.client.patch(f'/api/tooth-charts/{chart.pk}/teeth/44/',
                                  {'notes': 'LR4 note', 'pocket_depth': {'B': 4, 'general': 3}},
                                  format='json')
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.data['surface_conditions'], {'O': 'caries'})
        self.assertTrue(AuditEvent.objects.filter(action='tooth_finding_updated').exists())

    def test_new_note_rejects_inactive_dentist_but_history_remains_readable(self):
        payload = {'patient': str(self.patient.pk), 'dentist': self.inactive.pk,
                   'note_type': 'treatment', 'note_date': date.today(),
                   'chief_complaint': 'Review'}
        rejected = self.client.post('/api/clinical-notes/', payload, format='json')
        self.assertEqual(rejected.status_code, 400)
        from clinical.models import ClinicalNote
        note = ClinicalNote.objects.create(
            patient=self.patient, dentist=self.inactive, note_type='treatment',
            note_date=date.today(), chief_complaint='Historical review')
        historical = self.client.get(f'/api/clinical-notes/{note.pk}/')
        self.assertEqual(historical.status_code, 200)
        self.assertEqual(historical.data['dentist'], self.inactive.pk)

    def test_orthodontic_visit_update_moves_one_source_reminder(self):
        case = OrthodonticCase.objects.create(patient=self.patient, start_date=date.today(), diagnosis='Class II')
        first = date.today() + timedelta(days=42)
        visit = OrthodonticVisit.objects.create(
            ortho_case=case, dentist=self.dentist, visit_date=date.today(),
            visit_type='adjustment', next_review_date=first,
        )
        reminder = RecallSchedule.objects.create(
            patient=self.patient, recall_type='orthodontic', due_date=first,
            interval_days=42, notes=f'Generated from orthodontic visit {visit.pk}.',
            created_by=self.dentist,
        )
        second = first + timedelta(days=7)
        response = self.client.patch(f'/api/orthodontic-visits/{visit.pk}/',
                                     {'next_review_date': second}, format='json')
        self.assertEqual(response.status_code, 200)
        reminder.refresh_from_db()
        self.assertEqual(reminder.due_date, second)
        self.assertEqual(RecallSchedule.objects.filter(
            notes=f'Generated from orthodontic visit {visit.pk}.').count(), 1)
