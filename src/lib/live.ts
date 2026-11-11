// The dashboard stays hidden on the live site (every page "not found") until it's switched on with
// DASHBOARD_LIVE=true on Vercel's production environment. Previews and local runs always work.
export const hiddenOnLiveSite = () => process.env.VERCEL_ENV === "production" && process.env.DASHBOARD_LIVE !== "true";
