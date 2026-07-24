import { Button, Section } from '@react-email/components';
import { EmailBodyText, EmailFallbackLink, EmailLayout, EmailTitle } from './layout';

export function verifyEmailTemplate({ name, url }: { name: string; url: string }) {
  return (
    <EmailLayout preview="Verify your email address to start playing Codenames">
      <EmailTitle>Verify your email</EmailTitle>
      <EmailBodyText>
        Hi {name}, welcome to Codenames! Click the button below to verify your email address and
        activate your account.
      </EmailBodyText>
      <Section className="mt-[24px]">
        <Button
          href={url}
          className="rounded-[6px] bg-primary px-[24px] py-[12px] text-[14px] font-semibold text-white no-underline"
        >
          Verify email
        </Button>
      </Section>
      <EmailFallbackLink url={url} />
    </EmailLayout>
  );
}
