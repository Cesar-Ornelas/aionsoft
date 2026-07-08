import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  createSystemAlert,
  deleteSystemAlert,
  getSystemAlertsStoreErrorMessage,
  listSystemAlerts
} from "$lib/entities/system-alerts";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";

function readTrimmedString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function parseDateInput(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function combineDateAndTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  return parseDateInput(`${dateValue}T${timeValue}`);
}

function getNotice(searchParams: URLSearchParams) {
  if (searchParams.get("created") === "1") {
    return "System alert created.";
  }

  if (searchParams.get("deleted") === "1") {
    return "System alert deleted.";
  }

  return null;
}

export const load: PageServerLoad = async (event) => {
  await requireCurrentRequestUser(event);

  try {
    return {
      alerts: await listSystemAlerts(),
      notice: getNotice(event.url.searchParams),
      errorMessage: null
    };
  } catch (error) {
    return {
      alerts: [],
      notice: null,
      errorMessage: getSystemAlertsStoreErrorMessage(error)
    };
  }
};

export const actions: Actions = {
  create: async (event) => {
    const currentUser = await requireCurrentRequestUser(event);
    const formData = await event.request.formData();
    const title = readTrimmedString(formData, "title");
    const message = readTrimmedString(formData, "message");
    const type = readTrimmedString(formData, "type");
    const startDate = readTrimmedString(formData, "startDate");
    const startTime = readTrimmedString(formData, "startTime");
    const endDate = readTrimmedString(formData, "endDate");
    const endTime = readTrimmedString(formData, "endTime");
    const startsAtRaw = readTrimmedString(formData, "startsAt");
    const endsAtRaw = readTrimmedString(formData, "endsAt");

    const startsAt = combineDateAndTime(startDate, startTime) ?? parseDateInput(startsAtRaw);
    const endsAt = combineDateAndTime(endDate, endTime) ?? parseDateInput(endsAtRaw);
    const errors: Record<string, string> = {};

    if (!title) {
      errors.title = "Title is required.";
    }

    if (!message) {
      errors.message = "Message is required.";
    }

    if (!startDate) {
      errors.startDate = "Start date is required.";
    }

    if (!startTime) {
      errors.startTime = "Start time is required.";
    }

    if (!endDate) {
      errors.endDate = "End date is required.";
    }

    if (!endTime) {
      errors.endTime = "End time is required.";
    }

    if (startDate && startTime && !startsAt) {
      errors.startDate = "Start date and time are invalid.";
    }

    if (endDate && endTime && !endsAt) {
      errors.endDate = "End date and time are invalid.";
    }

    if (startsAt && endsAt && startsAt >= endsAt) {
      errors.endDate = "End date and time must be after start date and time.";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        intent: "create",
        errors,
        values: {
          title,
          message,
          type,
          startDate,
          startTime,
          endDate,
          endTime,
          startsAt: startsAtRaw,
          endsAt: endsAtRaw
        }
      });
    }

    try {
      await createSystemAlert({
        title,
        message,
        type: type === "info" || type === "success" || type === "warning" || type === "error" ? type : "warning",
        startsAt: startsAt!,
        endsAt: endsAt!,
        createdByUserId: currentUser.id
      });
    } catch (error) {
      return fail(500, {
        intent: "create",
        message: getSystemAlertsStoreErrorMessage(error),
        values: {
          title,
          message,
          type,
          startDate,
          startTime,
          endDate,
          endTime,
          startsAt: startsAtRaw,
          endsAt: endsAtRaw
        }
      });
    }

    throw redirect(303, "/management/system-alerts?created=1");
  },
  delete: async (event) => {
    await requireCurrentRequestUser(event);
    const formData = await event.request.formData();
    const alertId = readTrimmedString(formData, "alertId");

    if (!alertId) {
      return fail(400, {
        intent: "delete",
        message: "System alert id is required."
      });
    }

    try {
      await deleteSystemAlert(alertId);
    } catch (error) {
      return fail(500, {
        intent: "delete",
        message: getSystemAlertsStoreErrorMessage(error)
      });
    }

    throw redirect(303, "/management/system-alerts?deleted=1");
  }
};
