"""
CEO user management API tests.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole

User = get_user_model()


class UserManagementTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ceo = User.objects.create_user(
            username="ceo_manage",
            email="ceo_manage@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_manage",
            email="head_manage@test.com",
            password="pass12345",
            role=UserRole.SALES_HEAD,
        )

    def setUp(self):
        self.client = APIClient()

    def test_ceo_can_list_users(self):
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/auth/manage/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    def test_sales_head_cannot_manage_users(self):
        self.client.force_authenticate(user=self.sales_head)
        response = self.client.get("/api/v1/auth/manage/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ceo_can_create_user(self):
        self.client.force_authenticate(user=self.ceo)
        response = self.client.post(
            "/api/v1/auth/manage/users/",
            {
                "first_name": "New",
                "last_name": "Sales",
                "email": "newsales@test.com",
                "username": "newsales",
                "role": UserRole.SALESPERSON,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("temporary_password", response.data)
        self.assertTrue(User.objects.filter(username="newsales").exists())

    def test_ceo_can_reset_password(self):
        user = User.objects.create_user(
            username="resetme",
            email="resetme@test.com",
            password="oldpass123",
            role=UserRole.SALESPERSON,
        )
        self.client.force_authenticate(user=self.ceo)
        response = self.client.post(
            f"/api/v1/auth/manage/users/{user.id}/reset-password/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("temporary_password", response.data)

    def test_superuser_hidden_from_user_management(self):
        superuser = User.objects.create_superuser(
            username="sysadmin",
            email="admin@pravarteesales.com",
            password="pass12345",
            first_name="Admin",
            last_name="User",
        )
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/auth/manage/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [row["email"] for row in response.data]
        self.assertNotIn(superuser.email, emails)

    def test_ceo_cannot_modify_superuser(self):
        superuser = User.objects.create_superuser(
            username="sysadmin2",
            email="admin2@pravarteesales.com",
            password="pass12345",
            first_name="Admin",
            last_name="Two",
        )
        self.client.force_authenticate(user=self.ceo)
        deactivate = self.client.post(
            f"/api/v1/auth/manage/users/{superuser.id}/deactivate/",
        )
        self.assertEqual(deactivate.status_code, status.HTTP_404_NOT_FOUND)
        reset = self.client.post(
            f"/api/v1/auth/manage/users/{superuser.id}/reset-password/",
        )
        self.assertEqual(reset.status_code, status.HTTP_404_NOT_FOUND)
        patch = self.client.patch(
            f"/api/v1/auth/manage/users/{superuser.id}/",
            {"role": UserRole.SALESPERSON},
            format="json",
        )
        self.assertEqual(patch.status_code, status.HTTP_404_NOT_FOUND)
        superuser.refresh_from_db()
        self.assertTrue(superuser.is_active)
        self.assertEqual(superuser.role, UserRole.CEO)
