"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/currentUser";
import { splitTips, validateLog } from "@/lib/validation";

const covers = [
  "from-sky-400 to-teal-500",
  "from-amber-300 to-rose-500",
  "from-violet-400 to-indigo-600",
  "from-emerald-300 to-teal-600",
  "from-orange-300 to-red-500",
];

function readForm(formData) {
  const field = (name) => String(formData.get(name) ?? "");
  return {
    title: field("title"),
    region: field("region"),
    companion: field("companion"),
    body: field("body"),
    tips: field("tips"),
  };
}

export async function createLog(prevState, formData) {
  const values = readForm(formData);
  const errors = validateLog(values);
  if (Object.keys(errors).length > 0) return { errors, values };

  const body = values.body.trim().replace(/\r\n/g, "\n");
  let log;
  try {
    log = await prisma.travelLog.create({
      data: {
        title: values.title.trim(),
        region: values.region,
        companion: values.companion,
        body,
        excerpt: body.replace(/\s+/g, " ").slice(0, 80),
        tips: splitTips(values.tips),
        cover: covers[Math.floor(Math.random() * covers.length)],
        authorId: CURRENT_USER_ID,
      },
    });
  } catch (error) {
    console.error("로그 저장 실패", error);
    return { errors: { form: "저장 중 문제가 발생했습니다. 잠시 후 다시 시도하세요." }, values };
  }

  // redirect는 예외로 동작하므로 try 블록 밖에서 호출
  redirect(`/log/${log.id}`);
}
