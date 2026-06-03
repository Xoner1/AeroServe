import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule],
  template: `
    <div class="qr-scanner-overlay" (click)="close.emit()">
      <div class="qr-scanner-panel" (click)="$event.stopPropagation()">
        <div class="qr-header">
          <h3>Scanner QR Code</h3>
          <button class="qr-close" (click)="close.emit()">✕</button>
        </div>

        @if (!cameraAvailable) {
          <div class="qr-error">
            <p>Aucune caméra détectée. Veuillez utiliser un appareil avec caméra.</p>
          </div>
        }

        <div class="qr-viewport" [class.hidden]="!cameraAvailable">
          <zxing-scanner
            [formats]="formats"
            (scanSuccess)="onScan($event)"
            (scanError)="onError($event)"
            (camerasFound)="onCamerasFound($event)"
            [device]="selectedDevice"
          ></zxing-scanner>
          <div class="qr-frame"></div>
        </div>

        @if (scanError) {
          <div class="qr-error">{{ scanError }}</div>
        }

        @if (scanResult) {
          <div class="qr-result">
            <strong>Code scanné :</strong>
            <p>{{ scanResult }}</p>
          </div>
        }

        <div class="qr-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Fermer</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .qr-scanner-overlay {
      position: fixed; inset: 0; background: rgba(44,62,53,0.6);
      backdrop-filter: blur(6px); display: flex; align-items: center;
      justify-content: center; z-index: 500;
    }
    .qr-scanner-panel {
      background: #fff; border-radius: 20px; padding: 24px;
      width: 100%; max-width: 420px; box-shadow: 0 25px 50px rgba(0,0,0,0.2);
    }
    .qr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .qr-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #2C3E35; }
    .qr-close { background: none; border: none; font-size: 20px; color: #A8C5A0; cursor: pointer; }
    .qr-viewport { position: relative; border-radius: 12px; overflow: hidden; background: #000; min-height: 240px; }
    .qr-viewport.hidden { display: none; }
    .qr-viewport ::ng-deep video { width: 100%; height: auto; display: block; }
    .qr-frame {
      position: absolute; inset: 20%; border: 2px solid var(--accent);
      border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.3);
      pointer-events: none;
    }
    .qr-error { color: #C0483A; font-size: 13px; text-align: center; padding: 12px; }
    .qr-result { background: #E8F0EB; border-radius: 10px; padding: 12px; margin-top: 12px; }
    .qr-result strong { font-size: 12px; color: var(--accent); display: block; margin-bottom: 4px; }
    .qr-result p { font-size: 14px; color: #2C3E35; word-break: break-all; margin: 0; }
    .qr-footer { display: flex; justify-content: flex-end; margin-top: 16px; }
    .btn { padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all .2s; }
    .btn-secondary { background: #EDE9E2; color: #4A4D4B; }
    .btn-secondary:hover { background: #D8D2C8; }
  `]
})
export class QrScannerComponent {
  @Output() scanResult = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  formats = [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX];
  cameraAvailable = true;
  selectedDevice: MediaDeviceInfo | undefined;
  scanError = '';
  result = '';

  onScan(value: string): void {
    this.result = value;
    this.scanResult.emit(value);
  }

  onError(err: any): void {
    this.scanError = 'Erreur de lecture. Essayez de vous rapprocher du code QR.';
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    if (devices.length === 0) {
      this.cameraAvailable = false;
    } else {
      this.selectedDevice = devices[0];
    }
  }
}
