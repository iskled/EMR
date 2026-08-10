from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Task, TaskAttachment

User = get_user_model()


class Sprint1012HTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='h-admin@test.local', password='test', role='admin')
        cls.assignee = User.objects.create_user(email='h-user@test.local', password='test', role='assistant')

    def make_task(self, stage='pending_acceptance'):
        return Task.objects.create(title='Path task', created_by=self.admin, assigned_user=self.assignee,
                                   status=stage, progress_percentage=Task.percentage_for_stage(stage))

    def test_authoritative_stage_percentages(self):
        self.assertEqual(Task.STAGE_PERCENTAGES, {'pending_acceptance': 0, 'accepted': 25, 'in_progress': 50,
                         'waiting_for_vendor': 50, 'waiting_for_staff': 50, 'resolved': 90, 'closed': 100})

    def test_forward_and_reverse_transitions_record_percentages(self):
        task = self.make_task()
        self.client.force_authenticate(self.assignee)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/accept/').data['progress_percentage'], 25)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'in_progress'}).data['progress_percentage'], 50)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'resolved', 'note': 'Done'}).data['progress_percentage'], 90)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'closed', 'note': 'Checked'}).data['progress_percentage'], 100)
        reopened = self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'resolved', 'note': 'Reopened', 'reason': 'More work'})
        self.assertEqual(reopened.data['progress_percentage'], 90)
        history = reopened.data['progress_updates'][-1]
        self.assertEqual((history['previous_percentage'], history['new_percentage']), (100, 90))

    def test_invalid_reverse_and_direct_percentage_are_rejected(self):
        task = self.make_task('in_progress')
        self.client.force_authenticate(self.assignee)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'accepted'}).status_code, 400)
        self.assertIn(self.client.patch(f'/api/tasks/{task.pk}/', {'progress_percentage': 99}).status_code, (200, 403))
        task.refresh_from_db(); self.assertEqual(task.progress_percentage, 50)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/progress-updates/', {'note': 'x', 'percentage': 99}).status_code, 400)

    def test_attachment_upload_retired_and_history_preserved(self):
        task = self.make_task('accepted')
        old = TaskAttachment.objects.create(task=task, file=SimpleUploadedFile('old.txt', b'old'), uploaded_by=self.assignee)
        self.client.force_authenticate(self.assignee)
        response = self.client.post('/api/task-attachments/', {'task': task.pk, 'file': SimpleUploadedFile('new.txt', b'new')})
        self.assertEqual(response.status_code, 410)
        self.assertTrue(TaskAttachment.objects.filter(pk=old.pk).exists())

    def test_only_assignee_executes_and_admin_retains_crud(self):
        task = self.make_task('accepted')
        other = User.objects.create_user(email='h-other@test.local', password='test', role='dentist')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'in_progress'}).status_code, 404)
        self.client.force_authenticate(self.admin)
        created = self.client.post('/api/tasks/', {'title': 'Admin task', 'assigned_user': self.assignee.pk})
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data['progress_percentage'], 0)

    def test_only_admin_clears_alert_and_refresh_does_not_recreate_it(self):
        task = self.make_task('in_progress')
        task.due_date = timezone.localdate() - timedelta(days=1)
        task.save(update_fields=['due_date'])
        alert = next(item for item in task.generate_alerts() if item.alert_type == 'overdue')
        self.client.force_authenticate(self.assignee)
        self.assertEqual(self.client.post(f'/api/task-alerts/{alert.pk}/dismiss/').status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(f'/api/task-alerts/{alert.pk}/dismiss/').status_code, 200)
        task.generate_alerts()
        self.assertFalse(task.alerts.filter(alert_type='overdue', status='open').exists())
