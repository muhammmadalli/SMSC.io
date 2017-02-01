import { Component, OnInit } from "@angular/core";
import { Location } from "@angular/common";
import { CustomersService } from "../../customers.service";
import { ActivatedRoute } from "@angular/router";
import { NotificationService } from "../../../services/notification-service";
import { CustomersContactsService } from "../customers-contacts.service";

@Component({
    selector: 'contacts-create',
    templateUrl: './contacts-create.html'
})
export class ContactsCreateComponent implements OnInit {
    public model: any = {};

    public customerId: string = '';

    constructor(public customersService: CustomersService,
                public route: ActivatedRoute,
                public customersContactsService: CustomersContactsService,
                public notifications: NotificationService,
                public location: Location) {
    }

    ngOnInit() {
        // get id parameter
        this.route.params.subscribe((params) => {
            this.customerId = params['customerId'];
            console.log(this.customerId);
        });
    }

    onSubmit(model) {
        this.addCustomerURI(this.customerId)
            .subscribe((customerURI) => {
                model['customer'] = customerURI;

                this.customersContactsService.createContact(model)
                    .subscribe(() => {
                            this.notifications.createNotification('success', 'SUCCESS', 'customers.successCreateContact');
                        },
                        err => {
                            console.error(err);
                            this.notifications.createNotification('error', 'ERROR', 'customers.errorCreateContact');
                        });
            });
    }

    addCustomerURI(id: string) {
        return this.customersService.getCustomer(id)
            .map(res => res['_links'].self.href);
    }

}
