export type MobileBody = { mobile: string };
export type MobileCodeBody = { mobile: string; code: string };
export type RegisterBody = { displayName: string; mobile: string; password: string };
export type LoginBody = { mobile: string; password: string };
export type ResetPasswordBody = { resetToken: string; newPassword: string };
export type ChangePasswordBody = { currentPassword: string; newPassword: string };
export type ChangeMobileBody = { currentPassword: string; newMobile: string };
export type ConfirmMobileBody = { newMobile: string; code: string };
