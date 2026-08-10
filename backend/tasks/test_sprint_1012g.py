from datetime import date
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from patients.models import Patient
from .models import Task, TaskAttachment, TaskChecklistItem

User = get_user_model()


class Sprint1012GTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='g-admin@test.local', password='test', role='admin')
        cls.assignee = User.objects.create_user(email='g-assignee@test.local', password='test', role='assistant')
        cls.other = User.objects.create_user(email='g-other@test.local', password='test', role='dentist')
        cls.patient = Patient.objects.create(patient_code='G-0001', first_name='Ada', last_name='Okafor',
                                             date_of_birth=date(1990, 1, 1), gender='F', phone_primary='08030001122')
        cls.task = Task.objects.create(title='Secure task', created_by=cls.admin, assigned_user=cls.assignee,
                                       status='in_progress', patient=cls.patient)

    def test_historical_checklist_does_not_block_completion(self):
        TaskChecklistItem.objects.create(task=self.task, title='Legacy step', is_required=True)
        self.assertTrue(self.task.can_complete())

    def test_non_admin_checklist_mutations_are_forbidden(self):
        item = TaskChecklistItem.objects.create(task=self.task, title='Legacy step')
        self.client.force_authenticate(self.assignee)
        self.assertEqual(self.client.patch(f'/api/task-checklist-items/{item.pk}/', {'is_completed': True}).status_code, 403)
        self.assertEqual(self.client.post(f'/api/task-checklist-items/{item.pk}/complete/').status_code, 403)

    def test_patient_search_and_uuid_link_round_trip(self):
        self.client.force_authenticate(self.admin)
        found = self.client.get('/api/patients/search/?q=Ada%20Okafor')
        self.assertEqual(found.status_code, 200)
        self.assertEqual(str(found.data['results'][0]['id']), str(self.patient.pk))
        created = self.client.post('/api/tasks/', {'title': 'Patient follow up', 'task_type': 'patient_follow_up',
                                  'priority': 'normal', 'assigned_user': self.assignee.pk,
                                  'patient': str(self.patient.pk)}, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data['patient_detail']['full_name'], 'Ada Okafor')

    def test_non_admin_cannot_change_patient_link(self):
        self.client.force_authenticate(self.assignee)
        response = self.client.patch(f'/api/tasks/{self.task.pk}/', {'patient': None}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_attachment_preview_is_authenticated_authorized_and_not_public_url(self):
        file = SimpleUploadedFile('photo.png', b'\x89PNG\r\n\x1a\n' + b'0' * 20, content_type='image/png')
        attachment = TaskAttachment.objects.create(task=self.task, file=file, original_filename='photo.png',
                                                   mime_type='image/png', file_size=file.size, uploaded_by=self.assignee)
        self.client.force_authenticate(self.assignee)
        detail = self.client.get(f'/api/task-attachments/{attachment.pk}/').data
        self.assertNotIn('file', detail)
        self.assertNotIn('file_url', detail)
        self.assertIn('preview_url', detail)
        self.assertEqual(self.client.get(f'/api/task-attachments/{attachment.pk}/preview/').status_code, 200)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(f'/api/task-attachments/{attachment.pk}/preview/').status_code, 200)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f'/api/task-attachments/{attachment.pk}/preview/').status_code, 403)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(f'/api/task-attachments/{attachment.pk}/preview/').status_code, (401, 403))
