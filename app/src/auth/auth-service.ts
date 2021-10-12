/* eslint-disable */
import { PublicClientApplication, AuthorizationUrlRequest, SilentRequest, AuthenticationResult, Configuration, LogLevel, AccountInfo, InteractionRequiredAuthError, EndSessionRequest, RedirectRequest, PopupRequest } from "@azure/msal-browser";
import { SsoSilentRequest } from "@azure/msal-browser/dist/request/SsoSilentRequest";
import { StoreService } from "../services/store-service";

export const MSAL_CONFIG: Configuration = {
    auth: {
        clientId: "14dae618-166f-4726-b330-b257952ba3a8",
        authority: "https://3DStoryTeller.b2clogin.com/3DStoryTeller.onmicrosoft.com/B2C_1_SignUpSignIn/",
        knownAuthorities: ["3DStoryTeller.b2clogin.com"],
        redirectUri: "https://3dstorytellerdev.z8.web.core.windows.net/",
        navigateToLoginRequestUrl: false
    },
    cache: {
        cacheLocation: "localStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
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

export class AuthService {

    private myMSALObj: PublicClientApplication; // https://azuread.github.io/microsoft-authentication-library-for-js/ref/msal-browser/classes/_src_app_publicclientapplication_.publicclientapplication.html
    private account: AccountInfo; // https://azuread.github.io/microsoft-authentication-library-for-js/ref/msal-common/modules/_src_account_accountinfo_.html
    private loginRedirectRequest: RedirectRequest; // https://azuread.github.io/microsoft-authentication-library-for-js/ref/msal-browser/modules/_src_request_redirectrequest_.html
    private loginRequest: PopupRequest; // https://azuread.github.io/microsoft-authentication-library-for-js/ref/msal-browser/modules/_src_request_popuprequest_.html
    private profileRedirectRequest: RedirectRequest;
    private profileRequest: PopupRequest;
    private mailRedirectRequest: RedirectRequest;
    private mailRequest: PopupRequest;
    private silentProfileRequest: SilentRequest; // https://azuread.github.io/microsoft-authentication-library-for-js/ref/msal-browser/modules/_src_request_silentrequest_.html
    private silentMailRequest: SilentRequest;
    private silentLoginRequest: SsoSilentRequest;
    private readonly storeSvc: StoreService;
    private config: any;

    constructor(storeSvc: StoreService) {
        this.storeSvc = storeSvc;
        this.config = this.storeSvc.getConfig();
        let auth = this.config ? this.config.auth : null;
        if (MSAL_CONFIG.auth && auth) {
            MSAL_CONFIG.auth.clientId = auth.clientId;
            MSAL_CONFIG.auth.authority = auth.authority;
            MSAL_CONFIG.auth.knownAuthorities = [auth.authority];
            MSAL_CONFIG.auth.redirectUri = auth.redirectUri;
        }
        if (MSAL_CONFIG.cache && auth) {
            MSAL_CONFIG.cache.cacheLocation = auth.cacheLocation;
        }
        this.myMSALObj = new PublicClientApplication(MSAL_CONFIG);
        this.account = null as any;
        this.setRequestObjects();
    }

    /**
     * Initialize request objects used by this AuthModule.
     */
    private setRequestObjects(): void {
        let scopes = this.getScopes();
        this.loginRequest = {
            scopes: scopes
        };

        this.loginRedirectRequest = {
            ...this.loginRequest,
            redirectStartPage: MSAL_CONFIG.auth ? MSAL_CONFIG.auth.redirectUri : window.location.href
        };

        this.profileRequest = {
            scopes: ["https://zipzappapps001dev.b2clogin.com/zipzappapps001dev.onmicrosoft.com/B2C_1A_signup_signin_dob/User.Read"]
        };

        this.profileRedirectRequest = {
            ...this.profileRequest,
            redirectStartPage: window.location.href
        };

        // Add here scopes for access token to be used at MS Graph API endpoints.
        this.mailRequest = {
            scopes: ["Mail.Read"]
        };

        this.mailRedirectRequest = {
            ...this.mailRequest,
            redirectStartPage: window.location.href
        };

        this.silentProfileRequest = {
            scopes: ["openid", "profile", "https://zipzappapps001dev.b2clogin.com/zipzappapps001dev.onmicrosoft.com/B2C_1A_ProfileEdit_dob/User.Read"],
            account: null as any,
            forceRefresh: false
        };

        this.silentMailRequest = {
            scopes: ["openid", "profile", "Mail.Read"],
            account: null as any,
            forceRefresh: false
        };

        this.silentLoginRequest = {
            loginHint: "IDLAB@msidlab0.ccsctp.net",
            scopes: scopes
        }
    }

    /**
     * Calls getAllAccounts and determines the correct account to sign into, currently defaults to first account found in cache.
     * TODO: Add account chooser code
     * 
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */
    public getAccount(): AccountInfo {
        // need to call getAccount here?
        const currentAccounts = this.myMSALObj.getAllAccounts();
        if (currentAccounts === null) {
            console.log("No accounts detected");
            return null as any;
        }

        if (currentAccounts.length > 1) {
            // Add choose account code here
            console.log("Multiple accounts detected, need to add choose account code.");
            return currentAccounts[0];
        } else if (currentAccounts.length === 1) {
            return currentAccounts[0];
        }
        return null as any;
    }

    /**
     * Checks whether we are in the middle of a redirect and handles state accordingly. Only required for redirect flows.
     * 
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/initialization.md#redirect-apis
     */
    loadAuthModule(): void {
        this.myMSALObj.handleRedirectPromise().then((resp: AuthenticationResult | null) => {
            if (resp) {
                this.handleResponse(resp);
            }
        }).catch(console.error);
    }

    /**
     * Handles the response from a popup or redirect. If response is null, will check if we have any accounts and attempt to sign in.
     * @param response 
     */
    handleResponse(response: AuthenticationResult, onSuccessfulLogin?: Function) {
        if (response !== null) {
            this.account = response.account ? response.account : null as any;
        } else {
            this.account = this.getAccount();
        }

        if (this.account && onSuccessfulLogin) {
            // UIManager.showWelcomeMessage(this.account);
            onSuccessfulLogin(this.account);
        }
    }

    /**
     * Calls ssoSilent to attempt silent flow. If it fails due to interaction required error, it will prompt the user to login using popup.
     * @param request 
     */
    attemptSsoSilent(onSuccessfulAttempt?: Function) {
        if (this.account) {
            this.silentLoginRequest.loginHint = this.account.username || this.account.name;
        }
        let p = this.myMSALObj.ssoSilent(this.silentLoginRequest);
        p.then((response) => {
            console.log('ssoSilent', response);
            if (onSuccessfulAttempt) {
                onSuccessfulAttempt(response);
            }
            // UIManager.showWelcomeMessage(this.account);
        }).catch(error => {
            console.error("Silent Error: " + error);
            if (error instanceof InteractionRequiredAuthError) {
                this.login("loginPopup");
            }
        })
    }

    /**
     * Calls loginPopup or loginRedirect based on given signInType.
     * @param signInType 
     */
    login(signInType: string, onSuccessfulLogin?: Function): void {
        if (signInType === "loginPopup") {
            this.myMSALObj.loginPopup(this.loginRequest).then((resp: AuthenticationResult) => {
                this.handleResponse(resp, onSuccessfulLogin);
            }).catch(console.error);
        } else if (signInType === "loginRedirect") {
            this.myMSALObj.loginRedirect(this.loginRedirectRequest);
        }
    }

    /**
     * Logs out of current account.
     */
    logout(): void {
        const logOutRequest: EndSessionRequest = {
            account: this.account
        };

        this.myMSALObj.logoutRedirect(logOutRequest);
    }

    /**
     * Gets the token to read user profile data from MS Graph silently, or falls back to interactive redirect.
     */
    async getProfileTokenRedirect(): Promise<string> {
        if (this.account) {
            this.silentProfileRequest.account = this.account;
        }
        return this.getTokenRedirect(this.silentProfileRequest, this.profileRedirectRequest);
    }

    /**
     * Gets the token to read user profile data from MS Graph silently, or falls back to interactive popup.
     */
    async getProfileTokenPopup(): Promise<string> {
        if (this.account) {
            this.silentProfileRequest.account = this.account;
        }
        return this.getTokenPopup(this.silentProfileRequest, this.profileRequest);
    }

    /**
     * Gets the token to read mail data from MS Graph silently, or falls back to interactive redirect.
     */
    async getMailTokenRedirect(): Promise<string> {
        if (this.account) {
            this.silentMailRequest.account = this.account;
        }
        return this.getTokenRedirect(this.silentMailRequest, this.mailRedirectRequest);
    }

    /**
     * Gets the token to read mail data from MS Graph silently, or falls back to interactive popup.
     */
    async getMailTokenPopup(): Promise<string> {
        if (this.account) {
            this.silentMailRequest.account = this.account;
        }
        return this.getTokenPopup(this.silentMailRequest, this.mailRequest);
    }

    public getScopes(): string[] {
        let scopesUrl;
        let scopes;
        let auth = this.config ? this.config.auth : null;
        if (!auth || !auth.apiConfig) return [];
        scopesUrl = auth.apiConfig.scopesUrl;
        let arrScopes = auth.apiConfig.scopes ? auth.apiConfig.scopes.split(',') : [];
        scopes = arrScopes.map(s => `${scopesUrl}/${s.trim()}`);
        return scopes;
    }

    public getAccesssTokenStorageKey(a: AccountInfo): string {
        let auth = this.config ? this.config.auth : null;
        if (!a || !auth) return '';
        let keyPart = `${a.homeAccountId}-${a.environment}-accesstoken-${auth.clientId}--`;
        console.log('keyPart', keyPart);
        // let key = Object.keys(window[auth.cacheLocation]).filter(k => k.startsWith(keyPart))[0];
        let key = Object.keys(window[auth.cacheLocation]).filter(k => k.indexOf('-accesstoken-') >= 0)[0];
        console.log('keys', Object.keys(window[auth.cacheLocation]));
        console.log('key', key);
        return key;
    }

    public runWithToken(callback: Function) {
        let account = this.storeSvc.getAuthAccount(this.config.auth.cacheLocation);
        let key = this.getAccesssTokenStorageKey(account);
        let value = this.storeSvc.getValue(key, this.config.auth.cacheLocation);
        let accessTokenObj = JSON.parse(value);
        let expiresOn = parseFloat(`${accessTokenObj.expiresOn}000`); // is this correct?
        let utcNow = Date.now();
        if (utcNow > expiresOn) {
            console.log('token expired, acquiring a new token');
            this.attemptSsoSilent((response: AuthenticationResult) => {
                if (callback) callback(response.accessToken);
            });
        }
        else {
            console.log('reusing token');
            if (callback) callback(accessTokenObj.secret);
        }
    }

    public getClaims(token: string) {
        if (!token) return {};
        let payload = token.split('.')[1];
        if (!payload) return {};
        console.log('atob(payload)', atob(payload));
        let claims = JSON.parse(atob(payload));
        return claims;
    }

    editProfile(signInType: string, onSuccessfulEditProfile?: Function): void {
        if (signInType === "loginPopup") {
            this.myMSALObj.loginPopup({ authority: "https://zipzappapps001dev.b2clogin.com/zipzappapps001dev.onmicrosoft.com/B2C_1A_ProfileEdit_dob", scopes: ["User.Read"] }).then((resp: AuthenticationResult) => {
                this.handleResponse(resp, onSuccessfulEditProfile);
            }).catch(console.error);
        } else if (signInType === "loginRedirect") {
            this.myMSALObj.loginRedirect(this.profileRedirectRequest);
        }
    }


    /**
     * Gets a token silently, or falls back to interactive popup.
     */
    private async getTokenPopup(silentRequest: SilentRequest, interactiveRequest: PopupRequest): Promise<string> {
        try {
            const response: AuthenticationResult = await this.myMSALObj.acquireTokenSilent(silentRequest);
            return response.accessToken;
        } catch (e) {
            console.log("silent token acquisition fails.");
            if (e instanceof InteractionRequiredAuthError) {
                console.log("acquiring token using redirect");
                return this.myMSALObj.acquireTokenPopup(interactiveRequest).then((resp) => {
                    return resp.accessToken;
                }).catch((err) => {
                    console.error(err);
                    return '';
                });
            } else {
                console.error(e);
                return '';
            }
        }
    }

    /**
     * Gets a token silently, or falls back to interactive redirect.
     */
    private async getTokenRedirect(silentRequest: SilentRequest, interactiveRequest: RedirectRequest): Promise<string> {
        try {
            const response = await this.myMSALObj.acquireTokenSilent(silentRequest);
            return response.accessToken;
        } catch (e) {
            console.log("silent token acquisition fails.");
            if (e instanceof InteractionRequiredAuthError) {
                console.log("acquiring token using redirect");
                this.myMSALObj.acquireTokenRedirect(interactiveRequest).catch(console.error);
            } else {
                console.error(e);
            }
            return '';
        }
    }
}
