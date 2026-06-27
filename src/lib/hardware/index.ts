/**
 * Hardware abstraction layer for future IoT integration.
 * Replace Simulated* implementations with real device drivers
 * (Arduino Mega, ESP32, NFC readers, load cells, IR/ultrasonic sensors).
 */

export interface SensorReading {
  timestamp: Date;
  value: number;
  unit: string;
  status: "ok" | "warning" | "error";
}

export interface BottleDetectionResult {
  detected: boolean;
  material: "PET" | "HDPE" | "UNKNOWN";
  weightGrams: number;
  isValid: boolean;
  confidence: number;
  sensorData: {
    ir: SensorReading;
    loadCell: SensorReading;
    ultrasonic: SensorReading;
    material: SensorReading;
  };
}

export interface NFCReaderResult {
  success: boolean;
  cardId: string | null;
  studentId: string | null;
  error?: string;
}

export interface MachineHardwareStatus {
  motorRunning: boolean;
  motorStatus: "OK" | "STALLED" | "ERROR";
  storageLevel: number;
  storageCapacity: number;
  temperature: number;
  sensors: {
    ir: "active" | "inactive" | "error";
    loadCell: "active" | "inactive" | "error";
    ultrasonic: "active" | "inactive" | "error";
    material: "active" | "inactive" | "error";
  };
  lastHeartbeat: Date;
}

export interface IBottleValidator {
  validate(): Promise<BottleDetectionResult>;
}

export interface INFCReader {
  readCard(): Promise<NFCReaderResult>;
  isConnected(): Promise<boolean>;
}

export interface IMachineController {
  getStatus(): Promise<MachineHardwareStatus>;
  acceptBottle(): Promise<boolean>;
  rejectBottle(): Promise<boolean>;
  setMotor(state: boolean): Promise<void>;
}

export class SimulatedBottleValidator implements IBottleValidator {
  async validate(): Promise<BottleDetectionResult> {
    await this.simulateDelay(800, 1500);

    const isValid = Math.random() > 0.08;
    const weightGrams = 15 + Math.random() * 20;

    return {
      detected: true,
      material: isValid ? "PET" : "UNKNOWN",
      weightGrams: Math.round(weightGrams * 10) / 10,
      isValid,
      confidence: isValid ? 0.92 + Math.random() * 0.07 : 0.3 + Math.random() * 0.2,
      sensorData: {
        ir: { timestamp: new Date(), value: 1, unit: "bool", status: "ok" },
        loadCell: {
          timestamp: new Date(),
          value: weightGrams,
          unit: "g",
          status: "ok",
        },
        ultrasonic: {
          timestamp: new Date(),
          value: 12 + Math.random() * 5,
          unit: "cm",
          status: "ok",
        },
        material: {
          timestamp: new Date(),
          value: isValid ? 1 : 0,
          unit: "type",
          status: isValid ? "ok" : "warning",
        },
      },
    };
  }

  private simulateDelay(min: number, max: number): Promise<void> {
    const delay = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export class SimulatedNFCReader implements INFCReader {
  private cardMap: Map<string, string> = new Map();

  registerCard(cardId: string, studentId: string) {
    this.cardMap.set(cardId, studentId);
  }

  async readCard(): Promise<NFCReaderResult> {
    await new Promise((r) => setTimeout(r, 500));
    return {
      success: false,
      cardId: null,
      studentId: null,
      error: "NFC reader not connected — tap Student ID login for now",
    };
  }

  async isConnected(): Promise<boolean> {
    return false;
  }
}

export class SimulatedMachineController implements IMachineController {
  private motorRunning = false;
  private storageLevel = 127;
  private storageCapacity = 500;

  async getStatus(): Promise<MachineHardwareStatus> {
    return {
      motorRunning: this.motorRunning,
      motorStatus: "OK",
      storageLevel: this.storageLevel,
      storageCapacity: this.storageCapacity,
      temperature: 24 + Math.random() * 4,
      sensors: {
        ir: "active",
        loadCell: "active",
        ultrasonic: "active",
        material: "active",
      },
      lastHeartbeat: new Date(),
    };
  }

  async acceptBottle(): Promise<boolean> {
    this.motorRunning = true;
    await new Promise((r) => setTimeout(r, 1200));
    this.storageLevel++;
    this.motorRunning = false;
    return true;
  }

  async rejectBottle(): Promise<boolean> {
    this.motorRunning = true;
    await new Promise((r) => setTimeout(r, 800));
    this.motorRunning = false;
    return true;
  }

  async setMotor(state: boolean): Promise<void> {
    this.motorRunning = state;
  }

  setStorageLevel(level: number) {
    this.storageLevel = level;
  }
}

export const hardware = {
  bottleValidator: new SimulatedBottleValidator(),
  nfcReader: new SimulatedNFCReader(),
  machineController: new SimulatedMachineController(),
};
