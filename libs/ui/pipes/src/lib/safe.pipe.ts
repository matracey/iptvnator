import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({ name: 'safe', standalone: true })
export class SafePipe implements PipeTransform {
    private readonly sanitizer = inject(DomSanitizer);

    transform(url: string) {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
