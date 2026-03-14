import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MockModule, MockProvider } from 'ng-mocks';
import { EMPTY } from 'rxjs';
import { ConfirmDialogData } from './confirm-dialog.component';
import { DialogService } from './dialog.service';

describe('Service: Dialog', () => {
    let service: DialogService;
    let dialog: MatDialog;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [DialogService, MockProvider(MatDialog)],
            imports: [MockModule(MatDialogModule)],
        });

        service = TestBed.inject(DialogService);
        dialog = TestBed.inject(MatDialog);
    });

    it('should create the service', () => {
        expect(service).toBeTruthy();
    });

    it('should open a confirm dialog', () => {
        jest.spyOn(dialog, 'open').mockReturnValue({
            afterClosed: () => EMPTY,
        } as any);

        service.openConfirmDialog({
            title: 'Remove dialog',
            message: 'Message',
            onConfirm: jest.fn(),
        } as ConfirmDialogData);

        expect(dialog.open).toHaveBeenCalled();
    });

    it('should call onConfirm when dialog result is truthy', () => {
        const onConfirmSpy = jest.fn();
        const { Subject } = require('rxjs');
        const afterClosed$ = new Subject();

        jest.spyOn(dialog, 'open').mockReturnValue({
            afterClosed: () => afterClosed$.asObservable(),
        } as any);

        service.openConfirmDialog({
            title: 'Confirm',
            message: 'Are you sure?',
            onConfirm: onConfirmSpy,
        } as ConfirmDialogData);

        afterClosed$.next(true);
        afterClosed$.complete();

        expect(onConfirmSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm when dialog result is falsy', () => {
        const onConfirmSpy = jest.fn();
        const { Subject } = require('rxjs');
        const afterClosed$ = new Subject();

        jest.spyOn(dialog, 'open').mockReturnValue({
            afterClosed: () => afterClosed$.asObservable(),
        } as any);

        service.openConfirmDialog({
            title: 'Confirm',
            message: 'Are you sure?',
            onConfirm: onConfirmSpy,
        } as ConfirmDialogData);

        afterClosed$.next(false);
        afterClosed$.complete();

        expect(onConfirmSpy).not.toHaveBeenCalled();
    });
});
