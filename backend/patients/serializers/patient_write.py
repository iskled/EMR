from rest_framework import serializers

from patients.models import (
    Patient,
    MedicalHistory,
    DentalHistory,
)

from patients.utils import generate_patient_code


class PatientWriteSerializer(serializers.ModelSerializer):
    patient_code = serializers.CharField(read_only=True)

    class Meta:
        model = Patient

        fields = '__all__'

        read_only_fields = (
            'registered_by',
            'created_at',
            'updated_at',
        )

    def validate(self, attrs):

        required_fields = [
            'first_name',
            'last_name',
            'date_of_birth',
            'gender',
            'phone_primary',
        ]

        errors = {}

        for field in required_fields:
            if not attrs.get(field):
                errors[field] = 'This field is required.'

        if errors:
            raise serializers.ValidationError(errors)

        instance_pk = self.instance.pk if self.instance else None
        for field in ('phone_primary', 'email'):
            value = attrs.get(field)
            if value and Patient.objects.filter(**{f'{field}__iexact': value}).exclude(pk=instance_pk).exists():
                errors[field] = f'A patient with this {field.replace("_", " ")} already exists.'
        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):

        request = self.context['request']

        if not validated_data.get('patient_code'):
            validated_data['patient_code'] = generate_patient_code()

        validated_data['registered_by'] = request.user

        patient = super().create(validated_data)

        MedicalHistory.objects.create(
            patient=patient,
            updated_by=request.user
        )

        DentalHistory.objects.create(
            patient=patient
        )

        return patient
