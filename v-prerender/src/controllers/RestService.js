/**
 * Permet de gérer tout ce qui est lié à l'utilisateur
 */
export class RestService {

    /**
     * Setup for make this class a Singleton
     */
    constructor() {
        if (RestService.exists) {
            return RestService.instance;
        }
        RestService.instance = this;
        RestService.exists = true;
        return this;
    }

    async restRequest(method, url ,isAuth = false, requestBody, headers) {
        let fetchParams = {};

        if(isAuth){
            headers.Authorization =`Bearer ${localStorage.token}`;
        }

        if(requestBody && headers["Content-Type"] && headers["Content-Type"] === "application/json"){
            fetchParams.body = JSON.stringify(requestBody);
        }else{
            fetchParams.body = requestBody;
        }

        fetchParams.headers = headers;
        fetchParams.method = method;

        console.log("RestService: ", method, url, fetchParams);

        return await (await fetch(url, fetchParams)).json();
    }

}