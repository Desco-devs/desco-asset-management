import { NextRequest, NextResponse } from 'next/server';
import {
  validateVehicleData,
  validateEquipmentData,
  validateMaintenanceReportData,
  validateName,
  sanitizeInput
} from '@/lib/data-validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let validationResult;

    switch (type) {
      case 'vehicle':
        validationResult = validateVehicleData(data);
        break;
      case 'equipment':
        validationResult = validateEquipmentData(data);
        break;
      case 'maintenance':
        validationResult = validateMaintenanceReportData(data);
        break;
      case 'name':
        validationResult = validateName(data.name, data.fieldName || 'Name');
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid validation type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      sanitized: type === 'name' ? sanitizeInput(data.name) : null
    });

  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}