import { Button, Section } from '@react-email/components';
import { EmailBodyText, EmailFallbackLink, EmailLayout, EmailTitle } from './layout';

export function changeEmailConfirmationTemplate({
  name,
  newEmail,
  url,
}: {
  name: string;
  newEmail: string;
  url: string;
}) {
  return (
    <EmailLayout preview="Approve the email change on your Codenames account">
      <EmailTitle>Approve email change</EmailTitle>
      <EmailBodyText>
        Hi {name}, we received a request to change your Codenames account email to{' '}
        <strong>{newEmail}</strong>. Click the button below to approve the change — we'll then send
        a verification link to the new address.
      </EmailBodyText>
      <Section className="mt-[24px]">
        <Button
          href={url}
          className="rounded-[6px] bg-primary px-[24px] py-[12px] text-[14px] font-semibold text-white no-underline"
        >
          Approve change
        </Button>
      </Section>
      <EmailBodyText>
        If you didn't request this, ignore this email and consider changing your password.
      </EmailBodyText>
      <EmailFallbackLink url={url} />
    </EmailLayout>
  );
}
