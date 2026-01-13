import {RestService} from "@/controllers/RestService";

export class Controller {

    static async requestBuilder(method, request, isAuth = false, body = undefined, headers = {'Content-Type': 'application/json'}){
        return new Promise(function (resolve) {
            ((new RestService()).restRequest(method, `http://localhost:3040${request}`, isAuth, body, headers)
                .then( response => resolve(response)));
        });
    }

}
