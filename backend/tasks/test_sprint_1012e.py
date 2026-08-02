from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from core.models import AuditEvent
from .models import Task, TaskNotification, TaskProgressUpdate


User = get_user_model()


class SalesforceTaskLifecycleTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='lifecycle-admin@test.local', password='test', role='admin')
        cls.staff = User.objects.create_user(email='lifecycle-staff@test.local', password='test', role='assistant', first_name='Amina', last_name='Yusuf')
        cls.other = User.objects.create_user(email='lifecycle-other@test.local', password='test', role='dentist')

    def task(self, stage='pending_acceptance'):
        return Task.objects.create(title=f'Lifecycle {stage}', assigned_user=self.staff, created_by=self.admin, status=stage)

    def test_admin_cannot_accept_and_only_assignee_can_execute(self):
        task = self.task()
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/accept/').status_code, 403)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/accept/').status_code, 404)
        self.client.force_authenticate(self.staff)
        accepted = self.client.post(f'/api/tasks/{task.pk}/accept/')
        self.assertEqual(accepted.status_code, 200)
        self.assertEqual(accepted.data['status'], 'accepted')
        task.refresh_from_db()
        self.assertEqual(task.accepted_by, self.staff)
        self.assertIsNotNone(task.accepted_at)

    def test_complete_forward_lifecycle_is_append_only_and_audited(self):
        task = self.task('accepted')
        self.client.force_authenticate(self.staff)
        steps = [
            ('in_progress', '', ''),
            ('waiting_for_vendor', 'Vendor contacted', ''),
            ('waiting_for_staff', 'Awaiting rota confirmation', ''),
            ('resolved', 'Work verified', ''),
            ('closed', 'Closure confirmed', ''),
        ]
        for stage, note, reason in steps:
            response = self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': stage, 'note': note, 'reason': reason}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(list(TaskProgressUpdate.objects.filter(task=task).values_list('new_stage', flat=True)), [row[0] for row in steps])
        self.assertEqual(AuditEvent.objects.filter(action='task_stage_change', resource_id=str(task.pk)).count(), len(steps))

    def test_reverse_requires_reason_and_preserves_both_stages(self):
        task = self.task('resolved')
        TaskProgressUpdate.objects.create(task=task, note='Resolved once', status_at_time='resolved', event_type='stage_changed', previous_stage='in_progress', new_stage='resolved', created_by=self.staff)
        self.client.force_authenticate(self.staff)
        missing = self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'in_progress', 'note': 'Reopening'}, format='json')
        self.assertEqual(missing.status_code, 400)
        reopened = self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'in_progress', 'note': 'Reopening', 'reason': 'Issue recurred'}, format='json')
        self.assertEqual(reopened.status_code, 200)
        history = TaskProgressUpdate.objects.filter(task=task)
        self.assertEqual(history.count(), 2)
        self.assertEqual(history.last().event_type, 'reversed')
        self.assertEqual(history.last().reason, 'Issue recurred')

    def test_invalid_transition_and_required_stage_notes_are_rejected(self):
        task = self.task('accepted')
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'closed', 'note': 'Skip'}, format='json').status_code, 400)
        task.status = 'in_progress'
        task.save(update_fields=['status'])
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'resolved'}, format='json').status_code, 400)

    def test_admin_override_requires_reason_and_is_separately_audited(self):
        task = self.task('closed')
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(f'/api/tasks/{task.pk}/admin-override/', {'stage': 'resolved', 'note': 'Reopen'}).status_code, 400)
        response = self.client.post(f'/api/tasks/{task.pk}/admin-override/', {'stage': 'resolved', 'note': 'Reopen', 'reason': 'Compliance review'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(AuditEvent.objects.filter(action='task_admin_override', resource_id=str(task.pk)).exists())
        self.assertTrue(TaskNotification.objects.filter(task=task, recipient=self.staff, notification_type='task_admin_override').exists())

    def test_dashboard_stage_counters_are_distinct(self):
        for stage in ('pending_acceptance', 'accepted', 'in_progress', 'waiting_for_vendor', 'waiting_for_staff', 'resolved'):
            self.task(stage)
        closed = self.task('closed')
        closed.completed_at = timezone.now()
        closed.save(update_fields=['completed_at'])
        self.client.force_authenticate(self.admin)
        data = self.client.get('/api/tasks/metrics/').data
        for key in ('pending_acceptance', 'accepted', 'in_progress', 'waiting_for_vendor', 'waiting_for_staff', 'resolved', 'closed_today'):
            self.assertEqual(data[key], 1)
