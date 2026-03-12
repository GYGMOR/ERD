import { LogLevel, type Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        // Will be populated from .env 
        clientId: import.meta.env.VITE_MSAL_CLIENT_ID || "deine-client-id-hier",
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID || "deine-tenant-id-hier"}`,
        // Dynamische Erkennung der URL (wichtig für GitHub Pages Unterverzeichnisse wie /ERD/)
        redirectUri: typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : "/",
        postLogoutRedirectUri: typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : "/"
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
    scopes: ["User.Read"]
};
