
import twilio from "twilio";

function getTwilioClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
        throw new Error("Missing Twilio configuration");
    }

    return {
        client: twilio(accountSid, authToken),
        serviceSid,
    };
}

export async function sendSmsOtp(
    phone: string
): Promise<boolean> {
    const { client, serviceSid } = getTwilioClient();

    const result = await client.verify.v2
        .services(serviceSid)
        .verifications.create({
            to: phone,
            channel: "sms",
        });

    return result.status === "pending";
}

export async function verifySmsOtp(
    phone: string,
    code: string
): Promise<boolean> {
    const { client, serviceSid } = getTwilioClient();

    const result = await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({
            to: phone,
            code,
        });

    return result.status === "approved";
}
