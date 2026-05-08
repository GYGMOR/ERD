import { LogLevel, type Configuration } from "@azure/msal-browser";

const isProd = import.meta.env.PROD;
const redirectUri = window.location.origin + "/";

export const msalConfig: Configuration = {
    auth: {
        clientId: "eb95bf20-1f7d-499f-9fbe-8ba19df143a1",
        authority: "https://login.microsoftonline.com/a2dc3403-2722-4330-a6fb-a64d592d68ff",
        redirectUri: redirectUri,
        postLogoutRedirectUri: redirectUri
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
    },
    system: {	
        loggerOptions: {	
            loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {	
                if (containsPii) {		
                    return;		
                }		
                switch (level) {		
                    case LogLevel.Error:		
                        console.error(message);		
                        return;		
                    case LogLevel.Info:		
                        console.info(message);		
                        return;		
                    case LogLevel.Verbose:		
                        console.debug(message);		
                        return;		
                    case LogLevel.Warning:		
                        console.warn(message);		
                        return;		
                }	
            }	
        }	
    }
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit: 
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const loginRequest = {
    scopes: ["User.Read"],
    // "login" forces full credential re-entry every time — no SSO bypass after logout
    prompt: "login"
};
