from rest_framework.test import APITestCase

from authentication.models import User


class ClinicalWorkspaceRoleTests(APITestCase):
    def request_as(self, role, path='/api/clinical-notes/'):
        user = User.objects.create_user(email=f'{role}@workspace.test', password='unused', role=role)
        self.client.force_authenticate(user)
        return self.client.get(path)

    def test_admin_can_access_clinical_workspace_api(self):
        self.assertEqual(self.request_as('admin').status_code, 200)

    def test_dentist_can_access_clinical_workspace_api(self):
        self.assertEqual(self.request_as('dentist').status_code, 200)

    def test_assistant_can_access_supporting_clinical_api(self):
        self.assertEqual(self.request_as('assistant').status_code, 200)

    def test_receptionist_cannot_access_clinical_content(self):
        self.assertEqual(self.request_as('receptionist').status_code, 403)
