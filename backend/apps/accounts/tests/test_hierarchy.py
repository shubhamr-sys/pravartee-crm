from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.accounts.choices import UserRole
from apps.accounts.hierarchy import validate_manager_for_role, visible_team_members_for_user

User = get_user_model()


class HierarchyTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ceo = User.objects.create_user(
            username="ceo_hierarchy",
            email="ceo_hierarchy@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.sales_head_a = User.objects.create_user(
            username="head_a",
            email="head_a@test.com",
            password="pass12345",
            role=UserRole.SALES_HEAD,
            manager=cls.ceo,
        )
        cls.sales_head_b = User.objects.create_user(
            username="head_b",
            email="head_b@test.com",
            password="pass12345",
            role=UserRole.SALES_HEAD,
            manager=cls.ceo,
        )
        cls.sales_a = User.objects.create_user(
            username="sales_a",
            email="sales_a@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
            manager=cls.sales_head_a,
        )
        cls.sales_b = User.objects.create_user(
            username="sales_b",
            email="sales_b@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
            manager=cls.sales_head_b,
        )

    def test_sales_head_sees_only_own_team(self):
        visible = set(
            visible_team_members_for_user(self.sales_head_a).values_list("pk", flat=True),
        )
        self.assertEqual(visible, {self.sales_head_a.pk, self.sales_a.pk})

    def test_salesperson_sees_only_self(self):
        visible = set(
            visible_team_members_for_user(self.sales_a).values_list("pk", flat=True),
        )
        self.assertEqual(visible, {self.sales_a.pk})

    def test_validate_salesperson_requires_sales_head_manager(self):
        with self.assertRaises(ValueError):
            validate_manager_for_role(UserRole.SALESPERSON, self.ceo)

    def test_validate_sales_head_requires_ceo_manager(self):
        with self.assertRaises(ValueError):
            validate_manager_for_role(UserRole.SALES_HEAD, self.sales_head_a)
