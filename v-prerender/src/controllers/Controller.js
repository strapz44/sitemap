import {RestService} from "@/controllers/RestService";

export class Controller {

    static async requestBuilder(method, request, isAuth = false, body = undefined, headers = {'Content-Type': 'application/json'}){
        return new Promise(function (resolve) {
            const isAbs = /^https?:\/\//i.test(request)
            const url = isAbs ? request : (request.startsWith('/api') ? request : `/api${request}`)
            ;(new RestService()).restRequest(method, url, isAuth, body, headers)
                .then(response => resolve(response))
        });
    }

}
