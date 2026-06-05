"""
JWT authentication tests for Pravartee CRM.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.leads.models import LeadStage, ProductCategory

User = get_user_model()


class JWTAuthTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.password = "SecurePass123!"

        cls.ceo = User.objects.create_user(
            username="ceo_auth",
            email="ceo@auth.com",
            password=cls.password,
            first_name="CEO",
            last_name="User",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_auth",
            email="head@auth.com",
            password=cls.password,
            first_name="Head",
            last_name="User",
            role=UserRole.SALES_HEAD,
        )
        cls.salesperson = User.objects.create_user(
            username="salestest",
            email="salestest@gmail.com",
            password=cls.password,
            first_name="sales",
            last_name="test",
            role=UserRole.SALESPERSON,
        )

        cls.category = ProductCategory.objects.create(name="Auth Test Category")
        cls.stage = LeadStage.objects.create(name="Auth Stage", sequence=99)

    def setUp(self):
        self.client = APIClient()

    def _login(self, email, password=None):
        return self.client.post(
            "/api/v1/auth/login/",
            {"email": email, "password": password or self.password},
            format="json",
        )

    def _auth_header(self, access_token):
        return {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}

    # --- Login ---

    def test_successful_login_returns_tokens_and_user(self):
        response = self._login("salestest@gmail.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "salestest@gmail.com")
        self.assertEqual(response.data["user"]["role"], UserRole.SALESPERSON)
        self.assertEqual(response.data["user"]["username"], "salestest")
        self.assertNotIn("password", response.data["user"])
        self.assertNotIn("is_superuser", response.data["user"])

    def test_failed_login_returns_401(self):
        response = self._login("salestest@gmail.com", password="wrongpassword")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_failed_login_unknown_email_returns_401(self):
        response = self._login("nobody@auth.com")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_ceo_login_returns_ceo_role(self):
        response = self._login("ceo@auth.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["role"], UserRole.CEO)

    def test_sales_head_login_returns_sales_head_role(self):
        response = self._login("head@auth.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["role"], UserRole.SALES_HEAD)

    def test_salesperson_login_returns_salesperson_role(self):
        response = self._login("salestest@gmail.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["role"], UserRole.SALESPERSON)

    # --- Protected endpoints ---

    def test_protected_endpoint_without_token_denied(self):
        response = self.client.get("/api/v1/leads/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_protected_endpoint_with_token_allowed(self):
        login = self._login("salestest@gmail.com")
        access = login.data["access"]
        response = self.client.get(
            "/api/v1/leads/",
            **self._auth_header(access),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- /auth/me ---

    def test_me_endpoint_returns_authenticated_user(self):
        login = self._login("salestest@gmail.com")
        access = login.data["access"]
        response = self.client.get(
            "/api/v1/auth/me/",
            **self._auth_header(access),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "salestest@gmail.com")
        self.assertEqual(response.data["username"], "salestest")
        self.assertEqual(response.data["first_name"], "sales")
        self.assertEqual(response.data["last_name"], "test")

    def test_me_endpoint_without_token_denied(self):
        response = self.client.get("/api/v1/auth/me/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    # --- Token refresh ---

    def test_token_refresh_returns_new_access_token(self):
        login = self._login("salestest@gmail.com")
        refresh = login.data["refresh"]
        response = self.client.post(
            "/api/v1/auth/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_token_refresh_with_rotation_returns_new_refresh(self):
        login = self._login("salestest@gmail.com")
        old_refresh = login.data["refresh"]
        response = self.client.post(
            "/api/v1/auth/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("refresh", response.data)
        self.assertNotEqual(response.data["refresh"], old_refresh)

    # --- Logout & blacklist ---

    def test_logout_blacklists_refresh_token(self):
        login = self._login("salestest@gmail.com")
        access = login.data["access"]
        refresh = login.data["refresh"]

        logout = self.client.post(
            "/api/v1/auth/logout/",
            {"refresh": refresh},
            format="json",
            **self._auth_header(access),
        )
        self.assertEqual(logout.status_code, status.HTTP_200_OK)
        self.assertEqual(logout.data["message"], "Logged out successfully")

        refresh_attempt = self.client.post(
            "/api/v1/auth/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(refresh_attempt.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_authentication(self):
        login = self._login("salestest@gmail.com")
        response = self.client.post(
            "/api/v1/auth/logout/",
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
