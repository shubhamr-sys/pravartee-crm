"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import LeadForm from "@/components/leads/LeadForm";
import { LoadingState, ErrorState } from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import {
  createLead,
  fetchAssignableUsers,
  fetchCategories,
  fetchStages,
} from "@/lib/leadsService";
import { uploadLeadDocuments } from "@/lib/leadDocumentsService";
import type {
  AssignableUser,
  LeadFormData,
  LeadStage,
  ProductCategory,
} from "@/types/lead";
import { emptyLeadItem } from "@/types/lead";

const emptyForm: LeadFormData = {
  customer_name: "",
  company_name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  latitude: "",
  longitude: "",
  category: "",
  stage: "",
  gut_feeling_percent: "",
  business_segment: "",
  deal_value: "",
  billed_amount: "",
  gross_margin_amount: "",
  expected_close_date: "",
  lost_reason: "",
  competitor: "",
  recovery_action: "",
  notes: "",
  assigned_to: "",
  record_type: "LEAD",
  items: [emptyLeadItem()],
  pendingDocuments: [],
};

export default function NewLeadPage() {
  const router = useRouter();
  const { user, isCEO, isSalesHead } = useAuth();
  const canAssign = isCEO || isSalesHead;

  const [stages, setStages] = useState<LeadStage[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [initialValues, setInitialValues] = useState<LeadFormData>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [stageData, categoryData] = await Promise.all([
          fetchStages(),
          fetchCategories(),
        ]);
        setStages(stageData);
        setCategories(categoryData);

        const defaultStage =
          stageData.find((item) => item.name === "New")?.id || stageData[0]?.id || "";

        let defaultAssignee = "";
        if (canAssign) {
          const users = await fetchAssignableUsers();
          setAssignableUsers(users);
          // Sales Head: default assignment to self unless they pick a salesperson.
          if (isSalesHead && user?.id) {
            defaultAssignee = user.id;
          }
        }

        setInitialValues((current) => ({
          ...current,
          stage: defaultStage,
          assigned_to: defaultAssignee,
          items: [emptyLeadItem()],
        }));
      } catch {
        setLoadError("Unable to load form options.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [canAssign, isSalesHead, user?.id]);

  async function handleSubmit(values: LeadFormData) {
    setIsSubmitting(true);
    try {
      const submitValues = { ...values };
      if (!canAssign) {
        delete submitValues.assigned_to;
      } else if (!submitValues.assigned_to) {
        delete submitValues.assigned_to;
      }

      const lead = await createLead(submitValues);
      if (values.pendingDocuments.length > 0) {
        await uploadLeadDocuments(lead.id, values.pendingDocuments);
      }
      router.push(`/leads/${lead.id}?created=1`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Preparing lead form..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-teal-700 hover:text-teal-800">
          ← Back to leads
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Create Lead</h1>
        <p className="mt-1 text-sm text-slate-500">
          {canAssign
            ? "Create a lead with products and optionally assign it to a salesperson."
            : "Add products to this lead. It will be assigned to you automatically."}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <LeadForm
          mode="create"
          initialValues={initialValues}
          stages={stages}
          categories={categories}
          assignableUsers={assignableUsers}
          canAssign={canAssign}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
