import { signInSocial } from "@/app/(auth)/actions";
import { socialLabels } from "@/lib/auth";

const styles = {
  google: "border border-border bg-white text-slate-800 hover:bg-slate-50",
  kakao: "bg-[#FEE500] text-[#191919] hover:brightness-95",
};

// 키가 설정된 소셜 로그인만 버튼으로 표시
export default function SocialButtons({ providers, next }) {
  if (providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <form key={provider} action={signInSocial.bind(null, provider, next)}>
          <button type="submit" className={`w-full rounded-full px-6 py-2.5 text-sm font-semibold ${styles[provider]}`}>
            {socialLabels[provider]}로 계속하기
          </button>
        </form>
      ))}
      <p className="my-1 flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        또는 이메일로
      </p>
    </div>
  );
}
