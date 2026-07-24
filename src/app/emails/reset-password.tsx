import { Button, Section } from '@react-email/components';
import { EmailBodyText, EmailFallbackLink, EmailLayout, EmailTitle } from './layout';

export function resetPasswordTemplate({ name, url }: { name: string; url: string }) {
  return (
    <EmailLayout preview="Reset your Codenames password">
      <EmailTitle>Reset your password</EmailTitle>
      <EmailBodyText>
        Hi {name}, we received a request to reset your Codenames password. Click the button below
        to choose a new one. This link expires in 1 hour.
      </EmailBodyText>
      <Section className="mt-[24px]">
        <Button
          href={url}
          className="rounded-[6px] bg-primary px-[24px] py-[12px] text-[14px] font-semibold text-white no-underline"
        >
          Reset password
        </Button>
      </Section>
      <EmailBodyText>
        If you didn't request a password reset, no action is needed — your password is unchanged.
      </EmailBodyText>
      <EmailFallbackLink url={url} />
    </EmailLayout>
  );
}
