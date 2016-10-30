import { inject, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { HttpModule } from '@angular/http';
import { MockBackend } from '@angular/http/testing';
import { APP_PROVIDERS } from '../app.module';
import { TranslateService, TranslateLoader } from 'ng2-translate/ng2-translate';
import { DashboardService } from './dashboard.service';
import { DragulaService } from 'ng2-dragula/ng2-dragula';
import { CrudService } from '../crud/crud.service';
import { CRUD_PROVIDERS } from '../crud/common/crud-providers';
import { GridService } from '../services/grid.service';
import { HTTP_PROVIDERS } from '../common/mock/http-providers';
import { Router } from "@angular/router";
import {DashboardView} from "./dashboardView.component";
import {DashboardList} from "./models/dashboardList";
import {DashboardListItem} from "./models/dashboardListItem";
import {DashboardBox} from "./models/dashboardBox";
import {BoxResize} from "./models/dashboardBoxEnum";
import { Router } from '@angular/router';

class MockLocation {}

describe('DashboardComponent view', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DashboardViewComponent,
                TranslateService,
                DragulaService,
                DashboardService,
                TranslateLoader,
                ...CRUD_PROVIDERS,
                ...APP_PROVIDERS,
                GridService,
                MockBackend,
                { provide: Router, useClass: MockLocation },
                { provide: Location, useClass: MockLocation },
                ...HTTP_PROVIDERS,
                CrudService
            ],
            imports: [
                HttpModule
            ]
        });
    });

    let box;

    it('Init box classes', inject([DashboardView], (box) => {
        box.dashboardService.getDashboardBoxes().subscribe((res) => {
            this.boxesCss = new DashboardList<string>();
            this.boxes = new DashboardListItem<DashboardBox>();
            this.boxes.merge(res);
            box = res[0];
            //this.updateClasses();
        });
    }));

    it('Box resize', inject([DashboardView], (boxView) => {
        boxView.dashboardService.getDashboardBoxes().subscribe((res) => {
            let box: DashboardBox = res[0];

            let config: DashboardResizeConfig = {
                type: BoxResize.WIDTH,
                width: 25,
                height: 25,
                chart: null
            }

            boxView.resizeBox(config, 0, box);
        });
    }))

    it('should be defined CSS boxes', inject([DashboardView], (box) => {
        expect(box.boxesCss).toBeDefined();
    }));

    it('should be defined boxes list', inject([DashboardViewComponent], (box) => {
        expect(box.boxes).toBeDefined();
    }));

    it('Get box class name', inject([DashboardViewComponent], (box) => {
        expect(box.getBoxClass(25, 'chart')).toBeDefined('chart-m');
    }));

    it('Update classes', inject([DashboardView], (boxView) => {
        boxView.updateClasses();
    }));
});
