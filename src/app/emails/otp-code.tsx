import { Section, Text } from '@react-email/components';
import { EmailBodyText, EmailLayout, EmailTitle } from './layout';

export function otpCodeTemplate({ name, otp }: { name: string; otp: string }) {
  return (
    <EmailLayout preview={`${otp} is your Codenames verification code`}>
      <EmailTitle>Your verification code</EmailTitle>
      <EmailBodyText>
        Hi {name}, use this code to finish signing in to Codenames. It expires in 3 minutes.
      </EmailBodyText>
      <Section className="mt-[24px] rounded-[8px] bg-surface px-[24px] py-[16px] text-center">
        <Text
          className="m-0 text-[28px] font-bold tracking-[8px] text-ink"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
        >
          {otp}
        </Text>
      </Section>
      <EmailBodyText>
        If you weren't trying to sign in, you should change your password.
      </EmailBodyText>
    </EmailLayout>
  );
}
