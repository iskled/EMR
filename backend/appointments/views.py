from datetime import date, datetime, timedelta, time
from collections import defaultdict
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from core.audit_service import audit_event, model_snapshot
from core.audit import AuditLogMixin
from .models import Appointment, AppointmentType, WaitingList
from .serializers import (
    AppointmentListSerializer, AppointmentDetailSerializer,
    AppointmentWriteSerializer, AppointmentStatusSerializer,
    AppointmentTypeSerializer, WaitingListSerializer,
)
from .permissions import CanManageAppointments, CanManageWaitingList


class AppointmentTypeViewSet(viewsets.ModelViewSet):
    queryset = AppointmentType.objects.all()
    serializer_class = AppointmentTypeSerializer
    permission_classes = [CanManageAppointments]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('active_only') != 'false':
            qs = qs.filter(is_active=True)
        return qs


class AppointmentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageAppointments]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'dentist', 'appointment_type', 'scheduled_date', 'patient']
    search_fields = [
        'patient__first_name', 'patient__last_name', 'patient__patient_code',
        'chief_complaint',
    ]
    ordering_fields = ['scheduled_date', 'start_time', 'created_at', 'status']
    ordering = ['scheduled_date', 'start_time']

    def get_queryset(self):
        qs = Appointment.objects.select_related(
            'patient', 'dentist', 'appointment_type', 'created_by'
        )
        if self.request.user.role == 'dentist':
            qs = qs.filter(dentist=self.request.user)
        archived = self.request.query_params.get('archived', '').lower()
        if archived == 'true':
            qs = qs.filter(archived_at__isnull=False)
        elif archived != 'all':
            qs = qs.filter(archived_at__isnull=True)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return AppointmentListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return AppointmentWriteSerializer
        return AppointmentDetailSerializer

    # ── Status update ──────────────────────────────────────────────────────────

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        appointment = self.get_object()
        serializer = AppointmentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = appointment.status
        fields_to_update = ['status', 'updated_at']
        appointment.status = serializer.validated_data['status']
        if serializer.validated_data.get('cancellation_reason'):
            appointment.cancellation_reason = serializer.validated_data['cancellation_reason']
            fields_to_update.append('cancellation_reason')
        if serializer.validated_data.get('treatment_notes'):
            appointment.treatment_notes = serializer.validated_data['treatment_notes']
            fields_to_update.append('treatment_notes')

        appointment.save(update_fields=fields_to_update)
        reminder = getattr(appointment, 'recall_schedule', None)
        if reminder and reminder.status == 'booked':
            from clinical.reminder_workflow import transition_reminder
            if appointment.status == Appointment.STATUS_COMPLETED:
                transition_reminder(reminder, 'completed', request.user, request=request)
            elif appointment.status == Appointment.STATUS_CANCELLED:
                transition_reminder(reminder, 'confirmed', request.user, request=request)
        audit_event(
            'appointment_status_change',
            'Appointment',
            appointment.pk,
            request=request,
            patient_id=appointment.patient_id,
            previous_values={'status': old_status},
            new_values={'status': appointment.status},
            source_module='appointments',
            metadata={'cancellation_reason': serializer.validated_data.get('cancellation_reason', '')},
        )
        return Response(AppointmentDetailSerializer(appointment).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        appointment = self.get_object()
        if appointment.archived_at:
            return Response(AppointmentDetailSerializer(appointment).data)
        reason = (request.data.get('reason') or '').strip()
        appointment.archived_at = timezone.now()
        appointment.archived_by = request.user
        appointment.archive_reason = reason
        appointment.save(update_fields=['archived_at', 'archived_by', 'archive_reason', 'updated_at'])
        audit_event(
            'appointment_archived', 'Appointment', appointment.pk, request=request,
            patient_id=appointment.patient_id, previous_values={'archived_at': None},
            new_values={'archived_at': appointment.archived_at.isoformat()}, source_module='appointments',
            metadata={'reason': reason, 'status': appointment.status},
        )
        return Response(AppointmentDetailSerializer(appointment).data)

    def destroy(self, request, *args, **kwargs):
        appointment = self.get_object()
        if request.data.get('confirmation') != 'DELETE':
            return Response({'confirmation': 'Enter DELETE to permanently delete this appointment.'}, status=400)
        snapshot = model_snapshot(appointment)
        appointment_id = appointment.pk
        patient_id = appointment.patient_id
        response = super().destroy(request, *args, **kwargs)
        audit_event(
            'appointment_deleted', 'Appointment', appointment_id, request=request,
            patient_id=patient_id, previous_values=snapshot, source_module='appointments',
            metadata={'status': appointment.status},
        )
        return response

    # ── Calendar view (grouped by date) ────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        start_str = request.query_params.get('start')
        end_str = request.query_params.get('end')
        dentist_id = request.query_params.get('dentist')

        today = date.today()
        if start_str:
            try:
                start_date = date.fromisoformat(start_str)
            except ValueError:
                return Response({'error': 'Invalid start date.'}, status=400)
        else:
            start_date = today.replace(day=1)

        if end_str:
            try:
                end_date = date.fromisoformat(end_str)
            except ValueError:
                return Response({'error': 'Invalid end date.'}, status=400)
        else:
            # End of same month
            if start_date.month == 12:
                end_date = start_date.replace(year=start_date.year + 1, month=1, day=1)
            else:
                end_date = start_date.replace(month=start_date.month + 1, day=1)

        qs = self.get_queryset().filter(
            scheduled_date__gte=start_date,
            scheduled_date__lte=end_date,
        )
        if dentist_id:
            qs = qs.filter(dentist_id=dentist_id)

        grouped = defaultdict(list)
        for apt in qs:
            grouped[apt.scheduled_date.isoformat()].append({
                'id': str(apt.id),
                'patient_name': apt.patient.full_name,
                'patient_code': apt.patient.patient_code,
                'dentist_id': str(apt.dentist_id),
                'dentist_name': apt.dentist.get_full_name(),
                'type_name': apt.appointment_type.name,
                'type_color': apt.appointment_type.color,
                'start_time': apt.start_time.strftime('%H:%M'),
                'end_time': apt.end_time.strftime('%H:%M'),
                'duration_minutes': apt.duration_minutes,
                'status': apt.status,
            })

        return Response(dict(grouped))

    # ── Daily schedule view ────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def daily(self, request):
        day_str = request.query_params.get('date', date.today().isoformat())
        dentist_id = request.query_params.get('dentist')

        try:
            day = date.fromisoformat(day_str)
        except ValueError:
            return Response({'error': 'Invalid date format.'}, status=400)

        qs = self.get_queryset().filter(scheduled_date=day)
        if dentist_id:
            qs = qs.filter(dentist_id=dentist_id)
        qs = qs.order_by('start_time')

        return Response(AppointmentListSerializer(qs, many=True).data)

    # ── Available time slots ───────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='available-slots')
    def available_slots(self, request):
        dentist_id = request.query_params.get('dentist')
        date_str = request.query_params.get('date')
        duration = int(request.query_params.get('duration', 30))

        if not dentist_id or not date_str:
            return Response(
                {'error': 'dentist and date are required query parameters.'}, status=400
            )

        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        # Get all active appointments for that dentist that day
        booked = list(
            Appointment.objects.filter(
                dentist_id=dentist_id,
                scheduled_date=target_date,
                status__in=Appointment.ACTIVE_STATUSES,
            ).values('start_time', 'end_time', 'patient__first_name',
                     'patient__last_name', 'appointment_type__name',
                     'appointment_type__color')
        )

        # Generate 15-min slots from 08:00 to 18:00
        slots = []
        apt_dur = timedelta(minutes=duration)
        step = timedelta(minutes=15)

        cursor = datetime.combine(target_date, time(8, 0))
        day_end = datetime.combine(target_date, time(18, 0))

        while cursor + apt_dur <= day_end:
            slot_end = cursor + apt_dur

            # Check overlap with any booked appointment
            occupying = next(
                (
                    b for b in booked
                    if datetime.combine(target_date, b['start_time']) < slot_end
                    and datetime.combine(target_date, b['end_time']) > cursor
                ),
                None,
            )

            slots.append({
                'start': cursor.strftime('%H:%M'),
                'end': slot_end.strftime('%H:%M'),
                'available': occupying is None,
                'occupied_by': (
                    f"{occupying['patient__first_name']} {occupying['patient__last_name']} "
                    f"– {occupying['appointment_type__name']}"
                    if occupying else None
                ),
                'occupied_color': occupying['appointment_type__color'] if occupying else None,
            })
            cursor += step

        return Response({
            'slots': slots,
            'date': date_str,
            'duration_minutes': duration,
            'total_available': sum(1 for s in slots if s['available']),
        })


class WaitingListViewSet(viewsets.ModelViewSet):
    serializer_class = WaitingListSerializer
    permission_classes = [CanManageWaitingList]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'preferred_dentist', 'appointment_type']

    def get_queryset(self):
        return WaitingList.objects.select_related(
            'patient', 'preferred_dentist', 'appointment_type', 'scheduled_appointment'
        )

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Convert a waiting list entry into a real appointment."""
        entry = self.get_object()

        if entry.status == 'scheduled':
            return Response({'error': 'This patient is already scheduled.'}, status=400)

        apt_payload = {**request.data, 'patient': str(entry.patient_id)}
        write_serializer = AppointmentWriteSerializer(
            data=apt_payload, context={'request': request}
        )
        write_serializer.is_valid(raise_exception=True)
        appointment = write_serializer.save()

        entry.status = 'scheduled'
        entry.scheduled_appointment = appointment
        entry.save(update_fields=['status', 'scheduled_appointment', 'updated_at'])

        return Response(AppointmentDetailSerializer(appointment).data, status=201)
