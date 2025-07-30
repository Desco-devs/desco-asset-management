import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { partsSearchSchema } from '@/lib/validations/maintenance-reports';

// GET - Search and analyze parts usage across maintenance reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryParams = {
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      equipment_type: searchParams.get('equipment_type') || undefined,
      vehicle_type: searchParams.get('vehicle_type') || undefined,
      date_from: searchParams.get('date_from') ? new Date(searchParams.get('date_from')!) : undefined,
      date_to: searchParams.get('date_to') ? new Date(searchParams.get('date_to')!) : undefined,
    };

    const validationResult = partsSearchSchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { search, limit, equipment_type, vehicle_type, date_from, date_to } = validationResult.data;

    // Build parts usage statistics query
    let partsUsageQuery = `
      SELECT 
        unnest(parts_replaced) as part_name,
        COUNT(*) as usage_count,
        'equipment' as asset_type
      FROM maintenance_equipment_reports 
      WHERE array_length(parts_replaced, 1) > 0
    `;

    let vehiclePartsQuery = `
      SELECT 
        unnest(parts_replaced) as part_name,
        COUNT(*) as usage_count,
        'vehicle' as asset_type
      FROM maintenance_vehicle_reports 
      WHERE array_length(parts_replaced, 1) > 0
    `;

    const queryParams_db: any[] = [];
    let paramIndex = 1;

    // Add date filters
    if (date_from) {
      partsUsageQuery += ` AND date_reported >= $${paramIndex}`;
      vehiclePartsQuery += ` AND date_reported >= $${paramIndex}`;
      queryParams_db.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      partsUsageQuery += ` AND date_reported <= $${paramIndex}`;
      vehiclePartsQuery += ` AND date_reported <= $${paramIndex}`;
      queryParams_db.push(date_to);
      paramIndex++;
    }

    // Add equipment type filter if specified
    if (equipment_type) {
      partsUsageQuery += ` AND equipment_id IN (
        SELECT id FROM equipment WHERE type = $${paramIndex}
      )`;
      queryParams_db.push(equipment_type);
      paramIndex++;
    }

    // Add vehicle type filter if specified
    if (vehicle_type) {
      vehiclePartsQuery += ` AND vehicle_id IN (
        SELECT id FROM vehicles WHERE type = $${paramIndex}
      )`;
      queryParams_db.push(vehicle_type);
      paramIndex++;
    }

    // Combine queries
    const combinedQuery = `
      WITH all_parts AS (
        ${partsUsageQuery}
        UNION ALL
        ${vehiclePartsQuery}
      )
      SELECT 
        part_name,
        SUM(usage_count) as total_usage,
        COUNT(DISTINCT asset_type) as asset_types_count,
        ARRAY_AGG(DISTINCT asset_type) as asset_types
      FROM all_parts
      ${search ? `WHERE LOWER(part_name) LIKE LOWER($${paramIndex})` : ''}
      GROUP BY part_name
      ORDER BY total_usage DESC
      LIMIT $${search ? paramIndex + 1 : paramIndex}
    `;

    if (search) {
      queryParams_db.push(`%${search}%`);
    }
    queryParams_db.push(limit);

    const partsUsageStats = await prisma.$queryRawUnsafe(combinedQuery, ...queryParams_db);

    // Get specific maintenance reports that contain the searched parts (if search is provided)
    let recentReportsWithParts: any[] = [];
    if (search) {
      // Get recent equipment maintenance reports with the searched part
      const equipmentReports = await prisma.maintenance_equipment_report.findMany({
        where: {
          parts_replaced: {
            hasSome: [search] // Contains the searched part
          },
          ...(date_from && { date_reported: { gte: date_from } }),
          ...(date_to && { date_reported: { lte: date_to } }),
        },
        include: {
          equipment: {
            select: {
              id: true,
              brand: true,
              model: true,
              type: true,
            }
          }
        },
        orderBy: {
          date_reported: 'desc'
        },
        take: 10
      });

      // Get recent vehicle maintenance reports with the searched part
      const vehicleReports = await prisma.maintenance_vehicle_report.findMany({
        where: {
          parts_replaced: {
            hasSome: [search] // Contains the searched part
          },
          ...(date_from && { date_reported: { gte: date_from } }),
          ...(date_to && { date_reported: { lte: date_to } }),
        },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              type: true,
            }
          }
        },
        orderBy: {
          date_reported: 'desc'
        },
        take: 10
      });

      recentReportsWithParts = [
        ...equipmentReports.map(report => ({
          ...report,
          asset_type: 'equipment',
          asset: report.equipment
        })),
        ...vehicleReports.map(report => ({
          ...report,
          asset_type: 'vehicle',
          asset: report.vehicle
        }))
      ].sort((a, b) => new Date(b.date_reported).getTime() - new Date(a.date_reported).getTime()).slice(0, 10);
    }

    return NextResponse.json({
      success: true,
      data: {
        parts_usage_stats: partsUsageStats,
        recent_reports_with_parts: recentReportsWithParts,
        search_params: {
          search,
          equipment_type,
          vehicle_type,
          date_from,
          date_to,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Error searching parts:', error);
    return NextResponse.json(
      { error: 'Failed to search parts data' },
      { status: 500 }
    );
  }
}

// POST - Analyze parts replacement patterns
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { part_names, analysis_type = 'frequency' } = body;

    if (!Array.isArray(part_names) || part_names.length === 0) {
      return NextResponse.json(
        { error: 'part_names array is required' },
        { status: 400 }
      );
    }

    switch (analysis_type) {
      case 'frequency':
        // Analyze frequency of specific parts usage over time
        const frequencyAnalysis = await prisma.$queryRaw`
          WITH monthly_usage AS (
            SELECT 
              unnest(parts_replaced) as part_name,
              DATE_TRUNC('month', date_reported) as month,
              COUNT(*) as usage_count,
              'equipment' as asset_type
            FROM maintenance_equipment_reports 
            WHERE parts_replaced && ${part_names}
            GROUP BY DATE_TRUNC('month', date_reported), unnest(parts_replaced)
            
            UNION ALL
            
            SELECT 
              unnest(parts_replaced) as part_name,
              DATE_TRUNC('month', date_reported) as month,
              COUNT(*) as usage_count,
              'vehicle' as asset_type
            FROM maintenance_vehicle_reports 
            WHERE parts_replaced && ${part_names}
            GROUP BY DATE_TRUNC('month', date_reported), unnest(parts_replaced)
          )
          SELECT 
            part_name,
            month,
            SUM(usage_count) as total_usage,
            ARRAY_AGG(DISTINCT asset_type) as asset_types
          FROM monthly_usage
          WHERE part_name = ANY(${part_names})
          GROUP BY part_name, month
          ORDER BY month DESC, total_usage DESC
        `;

        return NextResponse.json({
          success: true,
          analysis_type: 'frequency',
          data: frequencyAnalysis
        });

      case 'correlation':
        // Analyze which parts are commonly replaced together
        const correlationAnalysis = await prisma.$queryRaw`
          WITH part_combinations AS (
            SELECT 
              parts_replaced,
              date_reported,
              'equipment' as asset_type
            FROM maintenance_equipment_reports 
            WHERE parts_replaced && ${part_names}
              AND array_length(parts_replaced, 1) > 1
            
            UNION ALL
            
            SELECT 
              parts_replaced,
              date_reported,
              'vehicle' as asset_type
            FROM maintenance_vehicle_reports 
            WHERE parts_replaced && ${part_names}
              AND array_length(parts_replaced, 1) > 1
          ),
          combinations AS (
            SELECT 
              unnest(parts_replaced) as part_a,
              unnest(parts_replaced) as part_b,
              asset_type
            FROM part_combinations
          )
          SELECT 
            part_a,
            part_b,
            COUNT(*) as co_occurrence_count,
            ARRAY_AGG(DISTINCT asset_type) as asset_types
          FROM combinations
          WHERE part_a != part_b
            AND (part_a = ANY(${part_names}) OR part_b = ANY(${part_names}))
          GROUP BY part_a, part_b
          HAVING COUNT(*) > 1
          ORDER BY co_occurrence_count DESC
          LIMIT 50
        `;

        return NextResponse.json({
          success: true,
          analysis_type: 'correlation',
          data: correlationAnalysis
        });

      default:
        return NextResponse.json(
          { error: 'Invalid analysis_type. Use "frequency" or "correlation"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error analyzing parts:', error);
    return NextResponse.json(
      { error: 'Failed to analyze parts data' },
      { status: 500 }
    );
  }
}