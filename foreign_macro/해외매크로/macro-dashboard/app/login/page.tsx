import { redirect } from "next/navigation";

// 로그인 페이지 비활성화 — 대시보드로 바로 이동
export default function LoginPage() {
  redirect("/dashboard");
}
