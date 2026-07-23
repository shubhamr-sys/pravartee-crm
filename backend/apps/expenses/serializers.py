from django.utils import timezone
from rest_framework import serializers

from apps.accounts.access import user_can_access_lead
from apps.accounts.serializers import UserProfileSerializer
from apps.expenses.choices import ExpenseCategory, ExpenseStatus
from apps.expenses.models import Expense
from apps.leads.models import Lead

MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_RECEIPT_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".doc",
    ".docx",
}


class ExpenseSerializer(serializers.ModelSerializer):
    submitted_by = UserProfileSerializer(read_only=True)
    reviewed_by = UserProfileSerializer(read_only=True)
    employee_name = serializers.SerializerMethodField()
    employee_role = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    display_id = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()
    claimed_amount = serializers.DecimalField(
        source="amount",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    approved_amount = serializers.SerializerMethodField()
    lead_name = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "display_id",
            "title",
            "submitted_by",
            "employee_name",
            "employee_role",
            "team_name",
            "lead",
            "lead_name",
            "category",
            "category_display",
            "amount",
            "claimed_amount",
            "approved_amount",
            "expense_date",
            "description",
            "receipt",
            "receipt_url",
            "status",
            "status_display",
            "reviewed_by",
            "reviewed_at",
            "review_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "display_id",
            "title",
            "submitted_by",
            "employee_name",
            "employee_role",
            "team_name",
            "lead_name",
            "claimed_amount",
            "approved_amount",
            "receipt_url",
            "status",
            "status_display",
            "category_display",
            "reviewed_by",
            "reviewed_at",
            "review_notes",
            "created_at",
            "updated_at",
        ]

    def get_employee_name(self, obj):
        return obj.submitted_by.get_full_name() or obj.submitted_by.username

    def get_employee_role(self, obj):
        return obj.submitted_by.get_role_display() if hasattr(obj.submitted_by, "get_role_display") else obj.submitted_by.role

    def get_title(self, obj):
        description = (obj.description or "").strip()
        if description:
            return description[:80]
        return f"{obj.get_category_display()} Expense"

    def get_display_id(self, obj):
        short = str(obj.id).replace("-", "")[:6].upper()
        return f"EXP-{short}"

    def get_team_name(self, obj):
        manager = getattr(obj.submitted_by, "manager", None)
        if manager is None:
            return None
        return manager.get_full_name() or manager.username

    def get_approved_amount(self, obj):
        if obj.status == ExpenseStatus.APPROVED:
            return obj.amount
        return None

    def get_lead_name(self, obj):
        if not obj.lead_id:
            return None
        return obj.lead.customer_name or obj.lead.company_name

    def get_receipt_url(self, obj):
        if not obj.receipt:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.receipt.url)
        return obj.receipt.url


class ExpenseCreateSerializer(serializers.ModelSerializer):
    lead = serializers.PrimaryKeyRelatedField(
        queryset=Lead.objects.all(),
        required=False,
        allow_null=True,
    )
    category = serializers.ChoiceField(
        choices=ExpenseCategory.choices,
        required=True,
    )
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=True,
    )
    expense_date = serializers.DateField(required=True)
    receipt = serializers.FileField(required=True, allow_null=False)

    class Meta:
        model = Expense
        fields = [
            "lead",
            "category",
            "amount",
            "expense_date",
            "description",
            "receipt",
        ]

    def validate_amount(self, value):
        if value is None:
            raise serializers.ValidationError("Amount is required.")
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate_category(self, value):
        if not value:
            raise serializers.ValidationError("Category is required.")
        return value

    def validate_expense_date(self, value):
        if not value:
            raise serializers.ValidationError("Expense date is required.")
        return value

    def validate_lead(self, lead):
        if lead is None:
            return lead
        request = self.context.get("request")
        if request and not user_can_access_lead(request.user, lead):
            raise serializers.ValidationError("You do not have access to this lead.")
        return lead

    def validate_receipt(self, receipt):
        if not receipt:
            raise serializers.ValidationError("Receipt is required.")
        if receipt.size > MAX_RECEIPT_SIZE_BYTES:
            raise serializers.ValidationError("Receipt must be 5 MB or smaller.")
        extension = ""
        if receipt.name and "." in receipt.name:
            extension = receipt.name[receipt.name.rindex(".") :].lower()
        if not extension or extension not in ALLOWED_RECEIPT_EXTENSIONS:
            raise serializers.ValidationError(
                "Unsupported receipt type. Use PDF, image, or Word files.",
            )
        return receipt

    def create(self, validated_data):
        from apps.activities.services import log_expense_submitted

        request = self.context["request"]
        expense = Expense.objects.create(
            submitted_by=request.user,
            status=ExpenseStatus.PENDING,
            **validated_data,
        )
        log_expense_submitted(expense, request.user)
        return expense


class ExpenseReviewSerializer(serializers.Serializer):
    review_notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        expense = self.context["expense"]
        if expense.status != ExpenseStatus.PENDING:
            raise serializers.ValidationError("Only pending expenses can be reviewed.")
        return attrs


class ExpenseSummarySerializer(serializers.Serializer):
    pending_count = serializers.IntegerField()
    approved_count = serializers.IntegerField()
    rejected_count = serializers.IntegerField()
    total_pending_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_approved_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
