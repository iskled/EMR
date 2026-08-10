from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase

from core.models import AuditEvent
from .models import Task, TaskAttachment, TaskChecklistItem, TaskNotification, TaskProgressUpdate


User = get_user_model()


class TaskCreationPermissionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.users = {
            role: User.objects.create_user(email=f'task-{role}@test.local', password='Task-Test-Only!', role=role)
            for role in ('admin', 'dentist', 'assistant', 'receptionist')
        }
        cls.inactive_assistant = User.objects.create_user(
            email='task-inactive-assistant@test.local',
            password='Task-Test-Only!',
            role='assistant',
            is_active=False,
        )

    def login_as(self, role):
        self.client.force_authenticate(self.users[role])

    def create_payload(self, **overrides):
        return {'title': 'Permission test task', 'task_type': 'administrative', **overrides}

    def test_admin_can_create_assigned_task_pending_acceptance_with_notification_and_audit(self):
        self.login_as('admin')
        response = self.client.post(
            '/api/tasks/',
            self.create_payload(
                assigned_user=self.users['assistant'].pk,
                status='pending_acceptance',
                patient=None,
                appointment=None,
                orthodontic_case=None,
                orthodontic_visit=None,
                inventory_item=None,
                inventory_alert=None,
                recurrence='none',
            ),
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'pending_acceptance')
        self.assertEqual(response.data['recurrence'], 'none')
        self.assertIsNone(response.data['patient'])
        self.assertTrue(TaskNotification.objects.filter(task_id=response.data['id'], recipient=self.users['assistant'], notification_type='task_assigned', is_read=False).exists())
        self.assertTrue(AuditEvent.objects.filter(action='create', resource_type='Task', resource_id=str(response.data['id']), success=True).exists())

    def test_staff_api_returns_full_display_and_excludes_inactive_users(self):
        self.login_as('admin')
        response = self.client.get('/api/tasks/staff/')
        self.assertEqual(response.status_code, 200)
        assistant = next(item for item in response.data if item['email'] == self.users['assistant'].email)
        self.assertIn('display_name', assistant)
        self.assertIn(assistant['email'], assistant['display_name'])
        self.assertIn(assistant['role'].title(), assistant['display_name'])
        self.assertFalse(any(item['email'] == self.inactive_assistant.email for item in response.data))

    def test_admin_create_ignores_no_recurrence_interval_and_end_date(self):
        self.login_as('admin')
        response = self.client.post(
            '/api/tasks/',
            self.create_payload(
                recurrence='none',
                recurrence_interval=None,
                recurrence_end_date=None,
            ),
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['recurrence'], 'none')
        self.assertEqual(response.data['recurrence_interval'], 1)

    def test_inactive_assignee_fails_clearly(self):
        self.login_as('admin')
        response = self.client.post(
            '/api/tasks/',
            self.create_payload(assigned_user=self.inactive_assistant.pk),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('assigned_user', response.data)
        self.assertEqual(response.data['assigned_user'][0], 'The selected assignee is inactive.')

    def test_due_date_before_start_date_fails_clearly(self):
        self.login_as('admin')
        response = self.client.post(
            '/api/tasks/',
            self.create_payload(start_date='2026-08-10', due_date='2026-08-09'),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('due_date', response.data)

    def test_recurring_task_validates_interval_and_end_date(self):
        self.login_as('admin')
        interval = self.client.post(
            '/api/tasks/',
            self.create_payload(recurrence='weekly', recurrence_interval=0, due_date='2026-08-10'),
            format='json',
        )
        end_date = self.client.post(
            '/api/tasks/',
            self.create_payload(recurrence='weekly', recurrence_interval=1, due_date='2026-08-10', recurrence_end_date='2026-08-09'),
            format='json',
        )
        valid = self.client.post(
            '/api/tasks/',
            self.create_payload(recurrence='weekly', recurrence_interval=1, due_date='2026-08-10', recurrence_end_date='2026-08-17'),
            format='json',
        )
        self.assertEqual(interval.status_code, 400)
        self.assertIn('recurrence_interval', interval.data)
        self.assertEqual(end_date.status_code, 400)
        self.assertIn('recurrence_end_date', end_date.data)
        self.assertEqual(valid.status_code, 201)

    def test_each_non_admin_receives_403_and_denial_is_audited(self):
        for role in ('dentist', 'assistant', 'receptionist'):
            with self.subTest(role=role):
                self.login_as(role)
                response = self.client.post('/api/tasks/', self.create_payload(title=f'{role} denied'), format='json')
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.data['detail'], 'You do not have permission to create tasks.')
                self.assertFalse(Task.objects.filter(title=f'{role} denied').exists())
                self.assertTrue(AuditEvent.objects.filter(action='task_creation_denied', user=self.users[role], endpoint='/api/tasks/', success=False, failure_reason='permission denied').exists())

    def test_non_admin_cannot_create_recurring_task_claim_or_generate_next(self):
        task = Task.objects.create(title='Recurring', recurrence='daily', due_date=timezone.localdate(), assigned_user=self.users['dentist'], created_by=self.users['admin'])
        available = Task.objects.create(title='Available', task_type='administrative', created_by=self.users['admin'])
        self.login_as('dentist')
        create_response = self.client.post('/api/tasks/', self.create_payload(recurrence='daily', due_date=str(timezone.localdate())), format='json')
        claim_response = self.client.post(f'/api/tasks/{available.pk}/claim/', {}, format='json')
        generate_response = self.client.post(f'/api/tasks/{task.pk}/generate-next/', {}, format='json')
        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(claim_response.status_code, 403)
        self.assertEqual(generate_response.status_code, 403)
        self.assertFalse(Task.objects.filter(parent_task=task).exists())

    def test_non_admin_cannot_create_or_edit_template(self):
        self.login_as('assistant')
        response = self.client.post('/api/task-checklist-templates/', {'name': 'Denied template', 'task_type': 'administrative'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_non_admin_cannot_duplicate_reassign_or_delete(self):
        task = Task.objects.create(title='Assigned', assigned_user=self.users['dentist'], created_by=self.users['admin'])
        self.login_as('dentist')
        duplicate = self.client.post(f'/api/tasks/{task.pk}/duplicate/', {}, format='json')
        reassign = self.client.post(f'/api/tasks/{task.pk}/reassign/', {'assigned_user': self.users['assistant'].pk}, format='json')
        delete = self.client.delete(f'/api/tasks/{task.pk}/')
        self.assertIn(duplicate.status_code, (403, 404, 405))
        self.assertEqual(reassign.status_code, 403)
        self.assertEqual(delete.status_code, 403)
        task.refresh_from_db()
        self.assertEqual(task.assigned_user, self.users['dentist'])

    def test_assigned_user_must_accept_before_working_task(self):
        task = Task.objects.create(title='Execute task', assigned_user=self.users['assistant'], status='pending_acceptance', created_by=self.users['admin'])
        TaskNotification.objects.create(
            task=task,
            recipient=self.users['assistant'],
            actor=self.users['admin'],
            notification_type='task_assigned',
            title='Assigned',
            message='Assigned by admin.',
        )
        item = TaskChecklistItem.objects.create(task=task, title='Required step', is_required=True)
        self.login_as('assistant')
        direct_complete = self.client.post(f'/api/tasks/{task.pk}/complete/', {}, format='json')
        accept = self.client.post(f'/api/tasks/{task.pk}/accept/', {}, format='json')
        premature_complete = self.client.post(f'/api/tasks/{task.pk}/complete/', {'summary': 'Done'}, format='json')
        update = self.client.patch(f'/api/tasks/{task.pk}/', {'status': 'in_progress'}, format='json')
        checklist = self.client.post(f'/api/task-checklist-items/{item.pk}/complete/', {}, format='json')
        start = self.client.post(f'/api/tasks/{task.pk}/start-work/', {'note': 'Started'}, format='json')
        resolve = self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'resolved', 'note': 'Finished all required work'}, format='json')
        complete = self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'closed', 'note': 'Final review complete'}, format='json')
        self.assertEqual(direct_complete.status_code, 400)
        self.assertEqual(accept.status_code, 200)
        self.assertEqual(accept.data['status'], 'accepted')
        self.assertIsNone(accept.data['completed_at'])
        self.assertEqual(update.status_code, 403)
        self.assertEqual(checklist.status_code, 403)
        self.assertEqual(premature_complete.status_code, 400)
        self.assertEqual(start.status_code, 200)
        self.assertEqual(start.data['status'], 'in_progress')
        self.assertEqual(resolve.status_code, 200)
        self.assertEqual(complete.status_code, 200)
        task.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(task.status, 'closed')
        self.assertEqual(task.progress_percentage, 100)
        self.assertFalse(item.is_completed)
        self.assertFalse(TaskNotification.objects.filter(task=task, recipient=self.users['assistant'], is_read=False).exists())
        self.assertTrue(AuditEvent.objects.filter(action='task_accept', resource_id=str(task.pk)).exists())
        self.assertTrue(AuditEvent.objects.filter(action='task_stage_change', resource_id=str(task.pk)).exists())

    def test_assigned_user_can_decline_and_admin_is_notified(self):
        task = Task.objects.create(title='Decline task', assigned_user=self.users['receptionist'], status='pending_acceptance', created_by=self.users['admin'])
        self.login_as('receptionist')
        response = self.client.post(f'/api/tasks/{task.pk}/decline/', {'reason': 'Schedule conflict'}, format='json')
        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.status, 'declined')
        self.assertEqual(task.decline_reason, 'Schedule conflict')
        self.assertTrue(TaskNotification.objects.filter(task=task, recipient=self.users['admin'], notification_type='task_declined').exists())
        self.assertTrue(AuditEvent.objects.filter(action='task_decline', resource_id=str(task.pk)).exists())

    def test_progress_waiting_reversal_and_attachment_workflow(self):
        task = Task.objects.create(title='Progress task', assigned_user=self.users['assistant'], status='accepted', created_by=self.users['admin'])
        self.login_as('assistant')
        start = self.client.post(f'/api/tasks/{task.pk}/start-work/', {'note': 'Started at desk'}, format='json')
        progress = self.client.post(f'/api/tasks/{task.pk}/progress-updates/', {'note': 'Half done'}, format='json')
        invalid_progress = self.client.post(f'/api/tasks/{task.pk}/progress-updates/', {'note': 'Too much', 'percentage': 101}, format='json')
        waiting = self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'waiting_for_vendor', 'note': 'Need supplies'}, format='json')
        resume = self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'in_progress', 'note': 'Supplies arrived', 'reason': 'Vendor delivered'}, format='json')
        waiting_staff = self.client.post(f'/api/tasks/{task.pk}/transition/', {'stage': 'waiting_for_staff', 'note': 'Need colleague review'}, format='json')
        self.assertEqual(start.status_code, 200)
        self.assertEqual(start.data['status'], 'in_progress')
        self.assertEqual(progress.status_code, 201)
        self.assertEqual(invalid_progress.status_code, 400)
        self.assertEqual(waiting.status_code, 200)
        self.assertEqual(waiting.data['status'], 'waiting_for_vendor')
        self.assertEqual(resume.status_code, 200)
        self.assertEqual(resume.data['status'], 'in_progress')
        self.assertEqual(waiting_staff.status_code, 200)
        self.assertEqual(waiting_staff.data['status'], 'waiting_for_staff')
        self.assertGreaterEqual(TaskProgressUpdate.objects.filter(task=task).count(), 5)
        notes = list(TaskProgressUpdate.objects.filter(task=task).values_list('note', flat=True))
        self.assertIn('Half done', notes)
        self.assertIn('Started at desk', notes)

    def test_attachment_upload_validation_and_authenticated_download(self):
        task = Task.objects.create(title='Attachment task', assigned_user=self.users['assistant'], status='in_progress', created_by=self.users['admin'])
        self.login_as('assistant')
        png = SimpleUploadedFile('evidence.png', b'\x89PNG\r\n\x1a\n' + b'0' * 20, content_type='image/png')
        upload = self.client.post('/api/task-attachments/', {'task': task.pk, 'file': png, 'caption': 'Evidence'}, format='multipart')
        bad = SimpleUploadedFile('bad.txt', b'plain text', content_type='text/plain')
        invalid = self.client.post('/api/task-attachments/', {'task': task.pk, 'file': bad}, format='multipart')
        self.assertEqual(upload.status_code, 410)
        self.assertEqual(invalid.status_code, 410)
        historical = SimpleUploadedFile('historical.png', b'old', content_type='image/png')
        attachment = TaskAttachment.objects.create(task=task, file=historical, original_filename='historical.png',
                                                   mime_type='image/png', uploaded_by=self.users['assistant'])
        download = self.client.get(f'/api/task-attachments/{attachment.pk}/download/')
        self.assertEqual(download.status_code, 200)
        self.login_as('dentist')
        forbidden = self.client.get(f'/api/task-attachments/{attachment.pk}/download/')
        self.assertEqual(forbidden.status_code, 403)

    def test_non_admin_update_cannot_change_assignment_or_recurrence(self):
        task = Task.objects.create(title='Protected fields', assigned_user=self.users['receptionist'], status='accepted', created_by=self.users['admin'])
        self.login_as('receptionist')
        response = self.client.patch(f'/api/tasks/{task.pk}/', {'assigned_user': self.users['dentist'].pk, 'recurrence': 'daily'}, format='json')
        self.assertEqual(response.status_code, 403)
        task.refresh_from_db()
        self.assertEqual(task.assigned_user, self.users['receptionist'])
        self.assertEqual(task.recurrence, 'none')

    def test_admin_can_generate_recurring_task_and_delete_task(self):
        task = Task.objects.create(title='Admin recurrence', recurrence='daily', due_date=timezone.localdate() - timedelta(days=1), created_by=self.users['admin'])
        deletable = Task.objects.create(title='Admin delete', created_by=self.users['admin'])
        self.login_as('admin')
        response = self.client.post(f'/api/tasks/{task.pk}/generate-next/', {}, format='json')
        delete = self.client.delete(f'/api/tasks/{deletable.pk}/', {'reason': 'Created for deletion test'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(delete.status_code, 204)
        self.assertTrue(Task.objects.filter(parent_task=task).exists())
        self.assertFalse(Task.objects.filter(pk=deletable.pk).exists())
        self.assertTrue(AuditEvent.objects.filter(action='task_delete', resource_id=str(deletable.pk)).exists())
