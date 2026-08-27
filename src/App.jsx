import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, DollarSign, AlertCircle, Plus, 
  FileText, Activity, LayoutGrid, Clock, CheckCircle2, 
  ChevronRight, LogOut, Search, Edit2, Trash2, X, Loader2, Printer, UserCheck, ShieldCheck, Paperclip, Save, RefreshCw, Eye, CalendarDays, Check, MessageSquare, Receipt, Lock, Mail
} from 'lucide-react';

import { supabase } from './lib/supabaseClient';

export default function App() {
  // --- ESTADOS DE AUTENTICACIÓN ---
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- ESTADOS DE LA APLICACIÓN ---
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Búsquedas por módulo
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [recordSearchTerm, setRecordSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [odontogramSearchTerm, setOdontogramSearchTerm] = useState('');
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState('');
  const [treatmentSearchTerm, setTreatmentSearchTerm] = useState('');

  // Modales de Creación / Edición
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isNewTreatmentModalOpen, setIsNewTreatmentModalOpen] = useState(false);
  
  // Modales de Consulta / Visualización
  const [isOdontogramFormModalOpen, setIsOdontogramFormModalOpen] = useState(false);
  const [viewingOdontogramItem, setViewingOdontogramItem] = useState(null);
  const [viewingTreatmentItem, setViewingTreatmentItem] = useState(null);
  const [viewingRecordItem, setViewingRecordItem] = useState(null);
  
  // Objetos en edición
  const [editingPatient, setEditingPatient] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editingOdontogramItem, setEditingOdontogramItem] = useState(null);
  const [editingTreatmentPlan, setEditingTreatmentPlan] = useState(null);
  
  // Cargas y Errores
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formError, setFormError] = useState('');

  // Estado para archivo adjunto en expediente
  const [selectedFile, setSelectedFile] = useState(null);

  // Listas Principales desde Supabase
  const [patients, setPatients] = useState([]);
  const [clinicalRecords, setClinicalRecords] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [odontogramList, setOdontogramList] = useState([]);
  const [treatmentPlansList, setTreatmentPlansList] = useState([]);

  // --- ESTADOS DE FORMULARIO DE PACIENTE ---
  const [patientForm, setPatientForm] = useState({
    name: '', dob: '', phone: '', email: '', emergency_contact: ''
  });

  // --- ESTADOS DE FORMULARIO DE USUARIOS ---
  const [userForm, setUserForm] = useState({
    full_name: '', email: '', role: 'doctor'
  });

  // --- ESTADOS DE FORMULARIO DE EXPEDIENTE ---
  const [recordForm, setRecordForm] = useState({
    patient_id: '',
    doctor_id: '',
    gender: 'Masculino',
    occupation: '',
    allergies: '',
    chronic_conditions: '',
    medications: '',
    notes: '',
    document_url: '',
    dob: '',
    email: '',
    emergency_contact: ''
  });

  // --- ESTADOS DE FORMULARIO DE AGENDA ---
  const [agendaViewMode, setAgendaViewMode] = useState('this_week'); 
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '',
    doctor_id: '',
    service: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '09:00',
    status: 'Pendiente',
    notes: ''
  });

  // --- ESTADOS DE FORMULARIO DE ODONTOGRAMA ---
  const [odontogramPatientId, setOdontogramPatientId] = useState('');
  const [odontogramTeeth, setOdontogramTeeth] = useState({});
  const [odontogramNotes, setOdontogramNotes] = useState('');
  const [activeTool, setActiveTool] = useState('caries');
  const [odontogramTypeView, setOdontogramTypeView] = useState('adult'); 
  const [isSavingOdontogram, setIsSavingOdontogram] = useState(false);

  // --- ESTADOS DE FORMULARIO PLAN DE TRATAMIENTO & PRESUPUESTO ---
  const [treatmentForm, setTreatmentForm] = useState({
    patient_id: '',
    doctor_id: '',
    title: 'Cotización / Plan Dental',
    status: 'En Borrador',
    discount_percent: 0,
    notes: ''
  });
  const [treatmentItems, setTreatmentItems] = useState([
    { description: 'Valoración Inicial & Limpieza', quantity: 1, unit_price: 50.00 }
  ]);

  // Mapeo de Superficies (Interfaz <-> Base de Datos)
  const surfaceToDb = {
    top: 'vestibular',
    bottom: 'lingual',
    left: 'mesial',
    right: 'distal',
    center: 'oclusal'
  };

  const dbToSurface = {
    vestibular: 'top',
    palatina: 'top',
    lingual: 'bottom',
    mesial: 'left',
    distal: 'right',
    oclusal: 'center',
    incisal: 'center'
  };

  // --- CONTROL DE SESIÓN Y CARGA INICIAL ---
  useEffect(() => {
    // 1. Verificar sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) fetchInitialData();
    });

    // 2. Escuchar cambios de autenticación (Login / Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchInitialData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) throw error;
      setSession(data.session);
    } catch (error) {
      setLoginError(error.message || 'Correo o contraseña incorrectos.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const fetchInitialData = async () => {
    setIsFetching(true);
    await Promise.all([
      fetchPatients(), 
      fetchUsers(), 
      fetchClinicalRecords(), 
      fetchAllOdontograms(),
      fetchAppointments(),
      fetchTreatmentPlans()
    ]);
    setIsFetching(false);
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
      if (data && data.length > 0 && !odontogramPatientId) {
        setOdontogramPatientId(data[0].id.toString());
      }
    } catch (error) {
      console.error('Error al consultar pacientes:', error.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsersList(data || []);
    } catch (error) {
      console.error('Error al consultar usuarios:', error.message);
    }
  };

  const fetchClinicalRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('clinical_records')
        .select(`
          *,
          patients ( id, name, dob, email, emergency_contact, phone ),
          users ( id, full_name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClinicalRecords(data || []);
    } catch (error) {
      console.error('Error al consultar expedientes:', error.message);
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients ( id, name, phone ),
          users ( id, full_name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalizedData = (data || []).map(item => {
        let dateVal = item.appointment_date;
        let timeVal = item.appointment_time;

        if (item.datetime && (!dateVal || !timeVal)) {
          const dt = new Date(item.datetime);
          if (!isNaN(dt.getTime())) {
            dateVal = dt.toISOString().split('T')[0];
            timeVal = dt.toTimeString().split(' ')[0].substring(0, 5);
          }
        }

        return {
          ...item,
          appointment_date: dateVal || new Date().toISOString().split('T')[0],
          appointment_time: timeVal || '09:00'
        };
      });

      setAppointmentsList(normalizedData);
    } catch (error) {
      console.error('Error al consultar citas:', error.message);
    }
  };

  const fetchAllOdontograms = async () => {
    try {
      const { data, error } = await supabase
        .from('odontogram_teeth')
        .select(`
          *,
          patients ( id, name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const grouped = {};
      (data || []).forEach(row => {
        const pId = row.patient_id;
        if (!grouped[pId]) {
          grouped[pId] = {
            patient_id: pId,
            patient_name: row.patients?.name || `Paciente #${pId}`,
            updated_at: row.created_at || row.updated_at || new Date().toISOString(),
            notes: row.notes || '',
            count: 0,
            teeth: {}
          };
        }
        if (row.notes && !grouped[pId].notes) {
          grouped[pId].notes = row.notes;
        }
        grouped[pId].count += 1;
        if (!grouped[pId].teeth[row.tooth_number]) {
          grouped[pId].teeth[row.tooth_number] = {};
        }
        const uiSurface = dbToSurface[row.surface] || row.surface;
        grouped[pId].teeth[row.tooth_number][uiSurface] = row.condition;
      });

      setOdontogramList(Object.values(grouped));
    } catch (error) {
      console.error("Error al obtener lista de odontogramas:", error.message);
    }
  };

  const fetchTreatmentPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          patients ( id, name, phone ),
          users ( id, full_name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTreatmentPlansList(data || []);
    } catch (error) {
      console.error('Error al consultar planes de tratamiento:', error.message);
    }
  };

  const doctorsOnly = usersList.filter(u => u.role === 'doctor');

  // --- REINICIO DE ESTADOS ---
  const resetPatientForm = () => {
    setPatientForm({ name: '', dob: '', phone: '', email: '', emergency_contact: '' });
    setEditingPatient(null);
    setFormError('');
    setIsLoading(false);
  };

  const resetUserForm = () => {
    setUserForm({ full_name: '', email: '', role: 'doctor' });
    setEditingUser(null);
    setFormError('');
    setIsLoading(false);
  };

  const resetRecordForm = () => {
    setRecordForm({
      patient_id: '',
      doctor_id: doctorsOnly[0]?.id || '',
      gender: 'Masculino',
      occupation: '',
      allergies: '',
      chronic_conditions: '',
      medications: '',
      notes: '',
      document_url: '',
      dob: '',
      email: '',
      emergency_contact: ''
    });
    setSelectedFile(null);
    setEditingRecord(null);
    setFormError('');
    setIsLoading(false);
  };

  const resetOdontogramForm = () => {
    setOdontogramTeeth({});
    setOdontogramNotes('');
    setEditingOdontogramItem(null);
    setOdontogramTypeView('adult');
    if (patients.length > 0) {
      setOdontogramPatientId(patients[0].id.toString());
    }
    setFormError('');
  };

  const resetAppointmentForm = () => {
    setAppointmentForm({
      patient_id: patients[0]?.id.toString() || '',
      doctor_id: doctorsOnly[0]?.id || '',
      service: '',
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '09:00',
      status: 'Pendiente',
      notes: ''
    });
    setEditingAppointment(null);
    setFormError('');
    setIsLoading(false);
  };

  const resetTreatmentForm = () => {
    setTreatmentForm({
      patient_id: patients[0]?.id.toString() || '',
      doctor_id: doctorsOnly[0]?.id || '',
      title: 'Cotización / Plan Dental',
      status: 'En Borrador',
      discount_percent: 0,
      notes: ''
    });
    setTreatmentItems([
      { description: 'Valoración Inicial & Limpieza', quantity: 1, unit_price: 50.00 }
    ]);
    setEditingTreatmentPlan(null);
    setFormError('');
    setIsLoading(false);
  };

  // --- PACIENTES ---
  const validatePatientForm = () => {
    const cleanName = patientForm.name.trim();
    if (!cleanName) {
      setFormError('El nombre del paciente es obligatorio.');
      return null;
    }
    if (!patientForm.dob) {
      setFormError('La fecha de nacimiento es obligatoria.');
      return null;
    }
    setFormError('');
    return {
      name: cleanName,
      dob: patientForm.dob,
      phone: patientForm.phone.trim() || '—',
      email: patientForm.email.trim() || '—',
      emergency_contact: patientForm.emergency_contact.trim() || '—'
    };
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    const cleanData = validatePatientForm();
    if (!cleanData) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('patients').insert([cleanData]).select();
      if (error) throw error;
      if (data) setPatients([...patients, data[0]]);
      resetPatientForm();
      setIsNewPatientModalOpen(false);
    } catch (error) {
      setFormError(error.message || 'Error al guardar en Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    const cleanData = validatePatientForm();
    if (!cleanData) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('patients').update(cleanData).eq('id', editingPatient.id).select();
      if (error) throw error;
      if (data) setPatients(patients.map(p => p.id === editingPatient.id ? data[0] : p));
      resetPatientForm();
    } catch (error) {
      setFormError(error.message || 'Error al actualizar paciente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePatient = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este paciente?')) {
      try {
        const { error } = await supabase.from('patients').delete().eq('id', id);
        if (error) throw error;
        setPatients(patients.filter(p => p.id !== id));
      } catch (error) {
        alert('Error al eliminar: ' + error.message);
      }
    }
  };

  // --- USUARIOS ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.full_name.trim() || !userForm.email.trim()) {
      setFormError('Los campos marcados son obligatorios.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim().toLowerCase(),
        role: userForm.role
      };

      const { data, error } = await supabase.from('users').insert([payload]).select();
      if (error) throw error;

      if (data) setUsersList([data[0], ...usersList]);
      resetUserForm();
      setIsNewUserModalOpen(false);
    } catch (error) {
      setFormError(error.message || 'Error al guardar el usuario en Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!userForm.full_name.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim().toLowerCase(),
        role: userForm.role
      };

      const { data, error } = await supabase.from('users').update(payload).eq('id', editingUser.id).select();
      if (error) throw error;

      if (data) setUsersList(usersList.map(u => u.id === editingUser.id ? data[0] : u));
      resetUserForm();
    } catch (error) {
      setFormError(error.message || 'Error al actualizar usuario.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('¿Deseas eliminar este usuario del personal médico?')) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        setUsersList(usersList.filter(u => u.id !== id));
      } catch (error) {
        alert('Error al borrar usuario: ' + error.message);
      }
    }
  };

  // --- EXPEDIENTES ---
  const uploadDocument = async (file) => {
    if (!file) return recordForm.document_url || '';

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `expedientes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('clinical-documents')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Error en el almacenamiento: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('clinical-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSelectPatientForRecord = (patientId) => {
    const idStr = patientId ? patientId.toString() : '';
    const selected = patients.find(p => p.id?.toString() === idStr);
    
    if (selected) {
      setRecordForm(prev => ({
        ...prev,
        patient_id: idStr,
        dob: selected.dob || '',
        email: selected.email || '',
        emergency_contact: selected.emergency_contact || ''
      }));
    } else {
      setRecordForm(prev => ({
        ...prev,
        patient_id: '',
        dob: '',
        email: '',
        emergency_contact: ''
      }));
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!recordForm.patient_id) {
      setFormError('Debes seleccionar un paciente.');
      return;
    }
    if (!recordForm.notes.trim()) {
      setFormError('Las notas clínicas son obligatorias.');
      return;
    }

    setIsLoading(true);
    setFormError('');

    try {
      let uploadedUrl = '';
      if (selectedFile) {
        try {
          uploadedUrl = await uploadDocument(selectedFile);
        } catch (storageError) {
          throw new Error(`Falló la carga del archivo adjunto: ${storageError.message}`);
        }
      }

      const payload = {
        patient_id: parseInt(recordForm.patient_id),
        doctor_id: recordForm.doctor_id || null,
        gender: recordForm.gender,
        occupation: recordForm.occupation.trim() || '—',
        allergies: recordForm.allergies.trim() || 'Ninguna',
        chronic_conditions: recordForm.chronic_conditions.trim() || 'Ninguna',
        medications: recordForm.medications.trim() || 'Ninguno',
        notes: recordForm.notes.trim(),
        document_url: uploadedUrl
      };

      const { error } = await supabase.from('clinical_records').insert([payload]);
      if (error) throw error;

      await fetchClinicalRecords();
      resetRecordForm();
      setIsNewRecordModalOpen(false);
    } catch (error) {
      console.error("Error al crear expediente:", error);
      setFormError(error.message || 'Error al guardar expediente unificado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditRecord = (record) => {
    setEditingRecord(record);
    setFormError('');
    setSelectedFile(null);
    
    const patient = record.patients || {};

    setRecordForm({
      patient_id: record.patient_id ? record.patient_id.toString() : '',
      doctor_id: record.doctor_id || '',
      gender: record.gender || 'Masculino',
      occupation: record.occupation === '—' ? '' : (record.occupation || ''),
      allergies: record.allergies === 'Ninguna' ? '' : (record.allergies || ''),
      chronic_conditions: record.chronic_conditions === 'Ninguna' ? '' : (record.chronic_conditions || ''),
      medications: record.medications === 'Ninguno' ? '' : (record.medications || ''),
      notes: record.notes || '',
      document_url: record.document_url || '',
      dob: patient.dob || '',
      email: patient.email || '',
      emergency_contact: patient.emergency_contact || ''
    });
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!recordForm.notes.trim()) {
      setFormError('Las notas clínicas son obligatorias.');
      return;
    }

    setIsLoading(true);
    setFormError('');

    try {
      let uploadedUrl = recordForm.document_url;
      if (selectedFile) {
        try {
          uploadedUrl = await uploadDocument(selectedFile);
        } catch (storageError) {
          throw new Error(`Falló la carga del archivo adjunto: ${storageError.message}`);
        }
      }

      const payload = {
        doctor_id: recordForm.doctor_id || null,
        gender: recordForm.gender,
        occupation: recordForm.occupation.trim() || '—',
        allergies: recordForm.allergies.trim() || 'Ninguna',
        chronic_conditions: recordForm.chronic_conditions.trim() || 'Ninguna',
        medications: recordForm.medications.trim() || 'Ninguno',
        notes: recordForm.notes.trim(),
        document_url: uploadedUrl,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('clinical_records')
        .update(payload)
        .eq('id', editingRecord.id);

      if (error) throw error;

      await fetchClinicalRecords();
      resetRecordForm();
    } catch (error) {
      console.error("Error al actualizar expediente:", error);
      setFormError(error.message || 'Error al actualizar expediente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm('¿Deseas eliminar este expediente clínico?')) {
      try {
        const { error } = await supabase.from('clinical_records').delete().eq('id', id);
        if (error) throw error;
        setClinicalRecords(clinicalRecords.filter(r => r.id !== id));
      } catch (error) {
        alert('Error al borrar expediente: ' + error.message);
      }
    }
  };

  const handlePrintRecord = (record) => {
    const printWindow = window.open('', '_blank');
    const patientName = record.patients?.name || 'Paciente Sin Nombre';
    const doctorName = record.users?.full_name || 'Sin Asignar';
    const recordDate = new Date(record.created_at).toLocaleDateString();

    printWindow.document.write(`
      <html>
        <head>
          <title>Expediente Unificado #${record.id} - Dientify</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
            .header { border-bottom: 2px solid #10B981; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #0F1720; }
            .subtitle { font-size: 14px; color: #666; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; margin-top: 20px; padding-bottom: 4px; color: #10B981; }
            .field { margin-bottom: 8px; font-size: 13px; }
            .label { font-weight: bold; }
            .notes-box { background: #f4f4f4; border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-top: 10px; white-space: pre-wrap; font-size: 13px; }
            .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
            .signature { margin-top: 60px; text-align: right; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">DIENTIFY DENTAL CLINIC</div>
            <div class="subtitle">Expediente Clínico Unificado — ID Registro: #${record.id}</div>
          </div>
          
          <div class="section-title">1. DATOS DE ATENCIÓN & PACIENTE</div>
          <div class="field" style="margin-top: 8px;"><span class="label">Odontólogo Tratante:</span> ${doctorName}</div>
          <div class="field"><span class="label">Paciente:</span> ${patientName}</div>
          <div class="field"><span class="label">Fecha de Atención:</span> ${recordDate}</div>
          <div class="field"><span class="label">Sexo:</span> ${record.gender || 'N/A'} | <span class="label">Ocupación:</span> ${record.occupation || 'N/A'}</div>
          <div class="field"><span class="label">Fecha de Nacimiento:</span> ${record.patients?.dob || 'N/A'}</div>
          <div class="field"><span class="label">Contacto de Emergencia:</span> ${record.patients?.emergency_contact || 'N/A'}</div>
          
          <div class="section-title">2. HISTORIAL MÉDICO GENERAL</div>
          <div class="field" style="margin-top: 8px;"><span class="label">Alergias:</span> ${record.allergies || 'Ninguna'}</div>
          <div class="field"><span class="label">Condiciones Crónicas:</span> ${record.chronic_conditions || 'Ninguna'}</div>
          <div class="field"><span class="label">Medicamentos Actuales:</span> ${record.medications || 'Ninguno'}</div>

          <div class="section-title">3. DIAGNÓSTICO & NOTAS CLÍNICAS</div>
          <div class="notes-box">${record.notes}</div>

          ${record.document_url ? `
            <div class="section-title">4. DOCUMENTOS ADJUNTOS</div>
            <div class="field" style="margin-top: 8px;">
              <span class="label">Archivo Clínico / Radiografía:</span> 
              <a href="${record.document_url}" target="_blank">${record.document_url}</a>
            </div>
          ` : ''}

          <div class="signature">
            _____________________________<br>
            Firma ${doctorName}
          </div>

          <div class="footer">Documento Oficial generado por Dientify Dental Management System</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- AGENDA ---
  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!appointmentForm.patient_id) {
      setFormError('Debes seleccionar un paciente.');
      return;
    }
    if (!appointmentForm.service.trim()) {
      setFormError('El tipo de servicio / tratamiento es obligatorio.');
      return;
    }

    setIsLoading(true);
    setFormError('');

    try {
      const combinedDatetime = new Date(`${appointmentForm.appointment_date}T${appointmentForm.appointment_time}:00`).toISOString();

      const payload = {
        patient_id: parseInt(appointmentForm.patient_id),
        doctor_id: appointmentForm.doctor_id || null,
        service: appointmentForm.service.trim(),
        appointment_date: appointmentForm.appointment_date,
        appointment_time: appointmentForm.appointment_time,
        datetime: combinedDatetime,
        status: appointmentForm.status,
        notes: appointmentForm.notes.trim()
      };

      const { error } = await supabase.from('appointments').insert([payload]);
      if (error) throw error;

      await fetchAppointments();
      resetAppointmentForm();
      setIsNewAppointmentModalOpen(false);
    } catch (error) {
      setFormError(error.message || 'Error al agendar la cita.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    if (!appointmentForm.service.trim()) {
      setFormError('El servicio es obligatorio.');
      return;
    }

    setIsLoading(true);
    setFormError('');

    try {
      const combinedDatetime = new Date(`${appointmentForm.appointment_date}T${appointmentForm.appointment_time}:00`).toISOString();

      const payload = {
        doctor_id: appointmentForm.doctor_id || null,
        service: appointmentForm.service.trim(),
        appointment_date: appointmentForm.appointment_date,
        appointment_time: appointmentForm.appointment_time,
        datetime: combinedDatetime,
        status: appointmentForm.status,
        notes: appointmentForm.notes.trim(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', editingAppointment.id);

      if (error) throw error;

      await fetchAppointments();
      resetAppointmentForm();
    } catch (error) {
      setFormError(error.message || 'Error al actualizar la cita.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;
      setAppointmentsList(appointmentsList.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a));
    } catch (error) {
      alert('Error al actualizar estatus: ' + error.message);
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (window.confirm('¿Deseas eliminar esta cita programada?')) {
      try {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) throw error;
        setAppointmentsList(appointmentsList.filter(a => a.id !== id));
      } catch (error) {
        alert('Error al borrar la cita: ' + error.message);
      }
    }
  };

  const handleOpenEditAppointment = (appt) => {
    setEditingAppointment(appt);
    setAppointmentForm({
      patient_id: appt.patient_id.toString(),
      doctor_id: appt.doctor_id || '',
      service: appt.service || '',
      appointment_date: appt.appointment_date || new Date().toISOString().split('T')[0],
      appointment_time: appt.appointment_time || '09:00',
      status: appt.status || 'Pendiente',
      notes: appt.notes || ''
    });
    setFormError('');
  };

  const handleSendWhatsApp = (appt) => {
    const patientName = appt.patients?.name || 'Estimado paciente';
    const patientPhone = (appt.patients?.phone || '').replace(/\D/g, ''); 
    const serviceName = appt.service || 'consulta dental';
    const apptDate = appt.appointment_date;
    const apptTime = appt.appointment_time;

    const message = `Hola *${patientName}*, le saludamos de *Dientify Dental Clinic* para recordarle su cita programada para el *${apptDate}* a las *${apptTime}* para el servicio de *${serviceName}*. Por favor confirmar asistencia. ¡Le esperamos!`;
    
    const whatsappUrl = `https://wa.me/${patientPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // --- ODONTOGRAMA ---
  const handleOpenEditOdontogram = (item) => {
    setEditingOdontogramItem(item);
    setOdontogramPatientId(item.patient_id.toString());
    setOdontogramTeeth(item.teeth || {});
    setOdontogramNotes(item.notes || '');
    setOdontogramTypeView('adult');
    setIsOdontogramFormModalOpen(true);
  };

  const handleSaveOdontogramForm = async (e) => {
    e.preventDefault();
    if (!odontogramPatientId) {
      setFormError('Debes seleccionar un paciente.');
      return;
    }

    setIsSavingOdontogram(true);
    setFormError('');

    try {
      const { error: deleteError } = await supabase
        .from('odontogram_teeth')
        .delete()
        .eq('patient_id', odontogramPatientId);

      if (deleteError) throw deleteError;

      const rowsToInsert = [];
      const now = new Date().toISOString();

      Object.entries(odontogramTeeth).forEach(([toothNumber, surfaces]) => {
        Object.entries(surfaces).forEach(([surface, condition]) => {
          if (condition) {
            rowsToInsert.push({
              patient_id: parseInt(odontogramPatientId),
              tooth_number: parseInt(toothNumber),
              surface: surfaceToDb[surface] || surface,
              condition: condition,
              notes: odontogramNotes.trim(),
              created_at: now,
              updated_at: now
            });
          }
        });
      });

      if (rowsToInsert.length === 0 && odontogramNotes.trim()) {
        rowsToInsert.push({
          patient_id: parseInt(odontogramPatientId),
          tooth_number: 11,
          surface: 'vestibular',
          condition: 'nota_general',
          notes: odontogramNotes.trim(),
          created_at: now,
          updated_at: now
        });
      }

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('odontogram_teeth')
          .insert(rowsToInsert);

        if (insertError) throw insertError;
      }

      await fetchAllOdontograms();
      setIsOdontogramFormModalOpen(false);
      resetOdontogramForm();
      alert('¡Odontograma guardado correctamente!');
    } catch (error) {
      console.error("Error al guardar odontograma:", error);
      setFormError(error.message || 'Error al guardar el odontograma.');
    } finally {
      setIsSavingOdontogram(false);
    }
  };

  const handleDeleteOdontogramRecord = async (patientId) => {
    if (window.confirm('¿Estás seguro de eliminar este registro de odontograma?')) {
      try {
        const { error } = await supabase
          .from('odontogram_teeth')
          .delete()
          .eq('patient_id', patientId);

        if (error) throw error;
        await fetchAllOdontograms();
        alert('Odontograma eliminado con éxito.');
      } catch (error) {
        alert('Error al borrar: ' + error.message);
      }
    }
  };

  const handlePrintOdontogram = (item) => {
    const printWindow = window.open('', '_blank');
    const teethData = item.teeth || {};
    
    let cariesCount = 0, doneCount = 0, endoCount = 0, missingCount = 0;
    Object.values(teethData).forEach(surfaces => {
      Object.values(surfaces).forEach(cond => {
        if (cond === 'caries') cariesCount++;
        if (cond === 'done') doneCount++;
        if (cond === 'endo') endoCount++;
        if (cond === 'missing') missingCount++;
      });
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Odontograma Clínico - ${item.patient_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
            .header { border-bottom: 2px solid #10B981; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; color: #0F1720; }
            .subtitle { font-size: 13px; color: #666; }
            .section-title { font-size: 15px; font-weight: bold; border-bottom: 1px solid #ccc; margin-top: 20px; padding-bottom: 4px; color: #10B981; }
            .kpis { display: flex; gap: 15px; margin-top: 15px; }
            .kpi-card { background: #f8f9fa; border: 1px solid #ddd; padding: 10px 15px; border-radius: 6px; font-size: 12px; }
            .notes-box { background: #f4f4f4; border: 1px solid #ddd; padding: 12px; border-radius: 6px; margin-top: 10px; white-space: pre-wrap; font-size: 13px; }
            .signature { margin-top: 60px; text-align: right; font-size: 13px; font-weight: bold; }
            .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">DIENTIFY DENTAL CLINIC</div>
            <div class="subtitle">Reporte Oficial de Odontograma Digital — Paciente: ${item.patient_name} (#${item.patient_id})</div>
          </div>
          
          <div class="section-title">1. DATOS GENERALES & RESUMEN DE HALLAZGOS</div>
          <div class="field" style="margin-top: 8px;"><strong>Fecha de Última Actualización:</strong> ${new Date(item.updated_at).toLocaleString()}</div>
          
          <div class="kpis">
            <div class="kpi-card">🔴 Caries / Pendientes: <strong>${cariesCount}</strong></div>
            <div class="kpi-card">🔵 Realizados / Buenos: <strong>${doneCount}</strong></div>
            <div class="kpi-card">🟢 Endodoncias / Coronas: <strong>${endoCount}</strong></div>
            <div class="kpi-card">⬛ Piezas Ausentes: <strong>${missingCount}</strong></div>
          </div>

          <div class="section-title">2. OBSERVACIONES & DIAGNÓSTICO CLÍNICO</div>
          <div class="notes-box">${item.notes || 'Sin observaciones registradas.'}</div>

          <div class="signature">
            _____________________________<br>
            Firma del Odontólogo Tratante
          </div>

          <div class="footer">Documento Oficial generado por Dientify Dental Management System</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSurfaceClick = (toothId, surface) => {
    setOdontogramTeeth(prev => {
      const currentTooth = prev[toothId] || {};
      const newTooth = { ...currentTooth };

      if (activeTool === 'clear') {
        delete newTooth[surface];
      } else {
        newTooth[surface] = activeTool;
      }

      return {
        ...prev,
        [toothId]: newTooth
      };
    });
  };

  // --- PLANES DE TRATAMIENTO & PRESUPUESTOS ---
  const handleAddTreatmentItem = () => {
    setTreatmentItems([...treatmentItems, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveTreatmentItem = (index) => {
    if (treatmentItems.length === 1) return;
    setTreatmentItems(treatmentItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...treatmentItems];
    updated[index][field] = value;
    setTreatmentItems(updated);
  };

  const calculateSubtotal = () => {
    return treatmentItems.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = parseFloat(treatmentForm.discount_percent) || 0;
    return subtotal - (subtotal * (discount / 100));
  };

  const handleCreateTreatmentPlan = async (e) => {
    e.preventDefault();
    if (!treatmentForm.patient_id) {
      setFormError('Debes seleccionar un paciente.');
      return;
    }

    setIsLoading(true);
    setFormError('');

    try {
      const subtotalVal = calculateSubtotal();
      const totalVal = calculateTotal();

      const payload = {
        patient_id: parseInt(treatmentForm.patient_id),
        doctor_id: treatmentForm.doctor_id || null,
        title: treatmentForm.title.trim() || 'Plan de Tratamiento',
        status: treatmentForm.status,
        discount_percent: parseFloat(treatmentForm.discount_percent) || 0,
        subtotal: subtotalVal,
        total: totalVal,
        notes: treatmentForm.notes.trim(),
        items: treatmentItems
      };

      const { error } = await supabase.from('treatment_plans').insert([payload]);
      if (error) throw error;

      await fetchTreatmentPlans();
      resetTreatmentForm();
      setIsNewTreatmentModalOpen(false);
      alert('¡Plan de tratamiento guardado con éxito!');
    } catch (error) {
      setFormError(error.message || 'Error al guardar la cotización.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTreatmentPlan = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');

    try {
      const subtotalVal = calculateSubtotal();
      const totalVal = calculateTotal();

      const payload = {
        doctor_id: treatmentForm.doctor_id || null,
        title: treatmentForm.title.trim() || 'Plan de Tratamiento',
        status: treatmentForm.status,
        discount_percent: parseFloat(treatmentForm.discount_percent) || 0,
        subtotal: subtotalVal,
        total: totalVal,
        notes: treatmentForm.notes.trim(),
        items: treatmentItems,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('treatment_plans')
        .update(payload)
        .eq('id', editingTreatmentPlan.id);

      if (error) throw error;

      await fetchTreatmentPlans();
      resetTreatmentForm();
      setIsNewTreatmentModalOpen(false);
      alert('¡Presupuesto actualizado correctamente!');
    } catch (error) {
      setFormError(error.message || 'Error al actualizar el presupuesto.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditTreatmentPlan = (plan) => {
    setEditingTreatmentPlan(plan);
    setTreatmentForm({
      patient_id: plan.patient_id.toString(),
      doctor_id: plan.doctor_id || '',
      title: plan.title || 'Cotización Dental',
      status: plan.status || 'En Borrador',
      discount_percent: plan.discount_percent || 0,
      notes: plan.notes || ''
    });
    setTreatmentItems(plan.items && plan.items.length > 0 ? plan.items : [{ description: 'Procedimiento General', quantity: 1, unit_price: 0 }]);
    setIsNewTreatmentModalOpen(true);
  };

  const handleDeleteTreatmentPlan = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta cotización / plan de tratamiento?')) {
      try {
        const { error } = await supabase.from('treatment_plans').delete().eq('id', id);
        if (error) throw error;
        setTreatmentPlansList(treatmentPlansList.filter(t => t.id !== id));
      } catch (error) {
        alert('Error al borrar plan: ' + error.message);
      }
    }
  };

  const handlePrintTreatmentPlan = (plan) => {
    const printWindow = window.open('', '_blank');
    const patientName = plan.patients?.name || 'Paciente Sin Nombre';
    const doctorName = plan.users?.full_name || 'Sin Asignar';
    const planDate = new Date(plan.created_at).toLocaleDateString();

    const itemsRows = (plan.items || []).map((item, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Cotización #${plan.id} - Dientify</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
            .header { border-bottom: 2px solid #10B981; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #0F1720; }
            .subtitle { font-size: 14px; color: #666; }
            .section-title { font-size: 15px; font-weight: bold; border-bottom: 1px solid #ccc; margin-top: 20px; padding-bottom: 4px; color: #10B981; }
            .field { margin-bottom: 8px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th { background: #f4f4f4; text-align: left; padding: 8px; border-bottom: 2px solid #ddd; }
            .totals { margin-top: 20px; text-align: right; font-size: 14px; }
            .totals div { margin-bottom: 5px; }
            .total-final { font-size: 18px; font-weight: bold; color: #10B981; }
            .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
            .signature { margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">DIENTIFY DENTAL CLINIC</div>
            <div class="subtitle">Presupuesto & Plan de Tratamiento #${plan.id}</div>
          </div>
          
          <div class="field"><span style="font-weight: bold;">Paciente:</span> ${patientName}</div>
          <div class="field"><span style="font-weight: bold;">Doctor Tratante:</span> ${doctorName}</div>
          <div class="field"><span style="font-weight: bold;">Fecha de Emisión:</span> ${planDate}</div>
          <div class="field"><span style="font-weight: bold;">Estado del Plan:</span> ${plan.status}</div>

          <div class="section-title">DESGLOSE DE PROCEDIMIENTOS & COSTOS</div>
          
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">#</th>
                <th>Procedimiento / Tratamiento</th>
                <th style="text-align: center;">Cant.</th>
                <th style="text-align: right;">P. Unitario</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals">
            <div>Subtotal: <strong>$${parseFloat(plan.subtotal || 0).toFixed(2)}</strong></div>
            ${plan.discount_percent > 0 ? `<div>Descuento Aplicado (${plan.discount_percent}%): -$${(plan.subtotal * (plan.discount_percent / 100)).toFixed(2)}</div>` : ''}
            <div class="total-final">Total Estimado: $${parseFloat(plan.total || 0).toFixed(2)}</div>
          </div>

          ${plan.notes ? `<div class="section-title">CONDICIONES & NOTAS</div><p style="font-size: 12px;">${plan.notes}</p>` : ''}

          <div class="signature">
            <div>
              _____________________________<br>
              Firma del Odontólogo
            </div>
            <div>
              _____________________________<br>
              Aceptación del Paciente
            </div>
          </div>

          <div class="footer">Presupuesto válido por 30 días a partir de la fecha de emisión — Dientify Dental Management</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- FILTROS DE TABLAS ---
  const filteredAppointments = appointmentsList.filter(appt => {
    const term = appointmentSearchTerm.toLowerCase();
    const patientName = (appt.patients?.name || '').toLowerCase();
    const doctorName = (appt.users?.full_name || '').toLowerCase();
    const serviceName = (appt.service || '').toLowerCase();
    const matchesSearch = patientName.includes(term) || doctorName.includes(term) || serviceName.includes(term);

    const apptDate = new Date(appt.appointment_date + 'T00:00:00');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startThisWeek = new Date(today.setDate(diffToMonday));
    const endThisWeek = new Date(startThisWeek);
    endThisWeek.setDate(startThisWeek.getDate() + 6);

    const startNextWeek = new Date(endThisWeek);
    startNextWeek.setDate(endThisWeek.getDate() + 1);
    const endNextWeek = new Date(startNextWeek);
    endNextWeek.setDate(startNextWeek.getDate() + 6);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (agendaViewMode === 'this_week') {
      return apptDate >= startThisWeek && apptDate <= endThisWeek && matchesSearch;
    }
    if (agendaViewMode === 'next_week') {
      return apptDate >= startNextWeek && apptDate <= endNextWeek && matchesSearch;
    }
    if (agendaViewMode === 'this_month') {
      return apptDate.getFullYear() === currentYear && apptDate.getMonth() === currentMonth && matchesSearch;
    }
    return matchesSearch;
  });

  const filteredUsers = usersList.filter(user => {
    const term = userSearchTerm.toLowerCase();
    return user.full_name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || user.role.toLowerCase().includes(term);
  });

  const filteredRecords = clinicalRecords.filter(record => {
    const term = recordSearchTerm.toLowerCase();
    const recordId = record.id.toString();
    const patientName = (record.patients?.name || '').toLowerCase();
    const doctorName = (record.users?.full_name || '').toLowerCase();
    const recordDate = new Date(record.created_at).toLocaleDateString();

    return recordId.includes(term) || patientName.includes(term) || doctorName.includes(term) || recordDate.includes(term);
  });

  const filteredPatients = patients.filter(patient => 
    (patient.name || '').toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
    (patient.id || '').toString().includes(patientSearchTerm)
  );

  const filteredOdontograms = odontogramList.filter(item => {
    const term = odontogramSearchTerm.toLowerCase();
    return item.patient_name.toLowerCase().includes(term) || item.patient_id.toString().includes(term);
  });

  const filteredTreatmentPlans = treatmentPlansList.filter(plan => {
    const term = treatmentSearchTerm.toLowerCase();
    const patientName = (plan.patients?.name || '').toLowerCase();
    const planTitle = (plan.title || '').toLowerCase();
    const planId = plan.id.toString();

    return patientName.includes(term) || planTitle.includes(term) || planId.includes(term);
  });

  const maxDate = new Date().toISOString().split('T')[0];

  // Componente Diente FDI
  const ToothComponent = ({ number, name, readOnly = false, teethState = odontogramTeeth }) => {
    const toothData = teethState[number] || {};

    const getColor = (surface) => {
      const state = toothData[surface];
      if (state === 'caries') return '#EF4444'; 
      if (state === 'done') return '#3B82F6';   
      if (state === 'endo') return '#10B981';   
      if (state === 'missing') return '#6B7280';
      return '#1F2937';                         
    };

    return (
      <div className="flex flex-col items-center p-1.5 bg-[#0F1720] border border-[#243647] rounded-lg">
        <span className="text-[10px] font-mono font-bold text-[#10B981] mb-1">#{number}</span>
        <div className="relative w-10 h-10 border border-gray-600 rounded bg-[#111827]">
          <button type="button" disabled={readOnly} onClick={() => !readOnly && handleSurfaceClick(number, 'top')} className="absolute top-0 left-2 right-2 h-2.5 transition-colors border-b border-gray-700 hover:opacity-80 disabled:cursor-default" style={{ backgroundColor: getColor('top') }} />
          <button type="button" disabled={readOnly} onClick={() => !readOnly && handleSurfaceClick(number, 'bottom')} className="absolute bottom-0 left-2 right-2 h-2.5 transition-colors border-t border-gray-700 hover:opacity-80 disabled:cursor-default" style={{ backgroundColor: getColor('bottom') }} />
          <button type="button" disabled={readOnly} onClick={() => !readOnly && handleSurfaceClick(number, 'left')} className="absolute top-2 bottom-2 left-0 w-2.5 transition-colors border-r border-gray-700 hover:opacity-80 disabled:cursor-default" style={{ backgroundColor: getColor('left') }} />
          <button type="button" disabled={readOnly} onClick={() => !readOnly && handleSurfaceClick(number, 'right')} className="absolute top-2 bottom-2 right-0 w-2.5 transition-colors border-l border-gray-700 hover:opacity-80 disabled:cursor-default" style={{ backgroundColor: getColor('right') }} />
          <button type="button" disabled={readOnly} onClick={() => !readOnly && handleSurfaceClick(number, 'center')} className="absolute top-2.5 bottom-2.5 left-2.5 right-2.5 transition-colors border border-gray-700 hover:opacity-80 rounded-sm disabled:cursor-default" style={{ backgroundColor: getColor('center') }} />
        </div>
        <span className="text-[9px] text-gray-400 mt-1 truncate max-w-[45px]" title={name}>{name}</span>
      </div>
    );
  };

  // --- RENDERIZADO CONDICIONAL DE AUTENTICACIÓN ---
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0F1720] text-gray-100">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
          <span className="text-sm font-medium">Cargando Dientify...</span>
        </div>
      </div>
    );
  }

  // PANTALLA DE LOGIN
  if (!session) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0F1720] text-gray-100 p-4">
        <div className="w-full max-w-md bg-[#16222F] border border-[#243647] rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-[#10B981] p-3 rounded-xl text-[#0B1117]">
              <Activity className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-wide text-white leading-tight">Dientify</h1>
              <span className="text-[10px] tracking-widest text-[#10B981] font-semibold block uppercase">Dental Management</span>
            </div>
          </div>

          <h2 className="text-lg font-bold text-white mb-1 text-center">Iniciar Sesión</h2>
          <p className="text-xs text-gray-400 mb-6 text-center">Ingresa tus credenciales para acceder al sistema clínico</p>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@dientify.com"
                  required
                  className="w-full bg-[#0F1720] border border-[#243647] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0F1720] border border-[#243647] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full mt-2 bg-[#10B981] hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#10B981]/10 flex items-center justify-center gap-2"
            >
              {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- INTERFAZ PRINCIPAL CON SESIÓN ACTIVA ---
  return (
    <div className="flex h-screen bg-[#0F1720] text-gray-100 font-sans overflow-hidden">
      
      {/* BARRA LATERAL */}
      <aside className="w-64 bg-[#0B1117] border-r border-[#243647] flex flex-col justify-between p-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="bg-[#10B981] p-2 rounded-xl text-[#0B1117]">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white leading-tight">Dientify</h1>
              <span className="text-[10px] tracking-widest text-[#10B981] font-semibold block uppercase">Dental Management</span>
            </div>
          </div>

          <nav className="space-y-6">
            <div>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'dashboard' ? 'bg-[#16222F] text-[#10B981] border-l-4 border-[#10B981]' : 'text-gray-400 hover:bg-[#16222F] hover:text-gray-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Dashboard Maestro
              </button>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 block">Gestión Clínica</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveTab('pacientes')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeTab === 'pacientes' ? 'bg-[#16222F] text-[#10B981] border-l-4 border-[#10B981]' : 'text-gray-400 hover:bg-[#16222F] hover:text-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Gestión de Pacientes
                </button>

                <button 
                  onClick={() => setActiveTab('expediente')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeTab === 'expediente' ? 'bg-[#16222F] text-[#10B981] border-l-4 border-[#10B981]' : 'text-gray-400 hover:bg-[#16222F] hover:text-gray-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Expediente Clínico
                </button>

                <button 
                  onClick={() => setActiveTab('odontograma')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeTab === 'odontograma' ? 'bg-[#16222F] text-[#10B981] border-l-4 border-[#10B981]' : 'text-gray-400 hover:bg-[#16222F] hover:text-gray-200'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Odontograma Digital
                </button>

                <button 
                  onClick={() => setActiveTab('tratamientos')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeTab === 'tratamientos' ? 'bg-[#16222F] text-[#10B981] border-l-4 border-[#10B981]' : 'text-gray-400 hover:bg-[#16222F] hover:text-gray-200'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  Planes & Presupuestos
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 block">Administración</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveTab('agenda')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeTab === 'agenda' ? 'bg-[#16222F] text-[#10B981] border-l-4 border-[#10B981]' : 'text-gray-400 hover:bg-[#16222F] hover:text-gray-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Agenda Multivista
                </button>

                <button 
                  onClick={() => setActiveTab('usuarios')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeTab === 'usuarios' ? 'bg-[#16222F] text-[#10B981] border-l-4 border-[#10B981]' : 'text-gray-400 hover:bg-[#16222F] hover:text-gray-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Gestión de Personal
                </button>
              </div>
            </div>
          </nav>
        </div>

        <div className="border-t border-[#243647] pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <div className="w-9 h-9 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center font-bold text-sm border border-[#10B981]/30 flex-shrink-0">US</div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{session.user.email}</p>
              <p className="text-[10px] text-gray-400">Sesión Activa</p>
            </div>
          </div>
          <button onClick={handleLogout} title="Cerrar Sesión" className="text-gray-400 hover:text-red-400 p-1 flex-shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-8 bg-[#0F1720]">
        
        {/* 1. DASHBOARD */}
        {activeTab === 'dashboard' && (
          <>
            <header className="mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Resumen General de Operaciones</h2>
              <p className="text-sm text-gray-400">Dientify Dental Clinic — Sistema Web Integral</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#16222F] border border-[#243647] p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pacientes Registrados</span>
                  <div className="text-3xl font-extrabold text-white mt-1">{patients.length}</div>
                </div>
                <div className="p-3 bg-[#1B2A38] text-[#10B981] rounded-xl border border-[#243647]"><Users className="w-6 h-6" /></div>
              </div>
              <div className="bg-[#16222F] border border-[#243647] p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Presupuestos Emitidos</span>
                  <div className="text-3xl font-extrabold text-white mt-1">{treatmentPlansList.length}</div>
                </div>
                <div className="p-3 bg-[#1B2A38] text-indigo-400 rounded-xl border border-[#243647]"><Receipt className="w-6 h-6" /></div>
              </div>
              <div className="bg-[#16222F] border border-[#243647] p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Citas Totales</span>
                  <div className="text-3xl font-extrabold text-white mt-1">{appointmentsList.length}</div>
                </div>
                <div className="p-3 bg-[#1B2A38] text-[#10B981] rounded-xl border border-[#243647]"><Calendar className="w-6 h-6" /></div>
              </div>
              <div className="bg-[#16222F] border border-[#243647] p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Planes Aprobados</span>
                  <div className="text-3xl font-extrabold text-white mt-1">
                    {treatmentPlansList.filter(t => t.status === 'Aprobado' || t.status === 'En Proceso').length}
                  </div>
                </div>
                <div className="p-3 bg-[#1B2A38] text-emerald-400 rounded-xl border border-[#243647]"><CheckCircle2 className="w-6 h-6" /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#16222F] border border-[#243647] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#10B981]" /> Próximas Citas Programadas
                  </h3>
                  <button onClick={() => setActiveTab('agenda')} className="text-xs font-semibold text-[#10B981] hover:underline flex items-center gap-1">
                    Ver agenda <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="text-xs uppercase bg-[#1B2A38] text-gray-400 border-b border-[#243647]">
                      <tr>
                        <th className="py-3 px-4">Fecha / Hora</th>
                        <th className="py-3 px-4">Paciente</th>
                        <th className="py-3 px-4">Tratamiento</th>
                        <th className="py-3 px-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#243647]">
                      {appointmentsList.slice(0, 4).map((appt) => (
                        <tr key={appt.id} className="hover:bg-[#1B2A38]/50">
                          <td className="py-3.5 px-4 font-mono text-xs text-white">{appt.appointment_date} <span className="text-[#10B981]">{appt.appointment_time}</span></td>
                          <td className="py-3.5 px-4 font-medium text-white">{appt.patients?.name || '—'}</td>
                          <td className="py-3.5 px-4 text-gray-400">{appt.service}</td>
                          <td className="py-3.5 px-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#10B981]/10 text-[#10B981]">{appt.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#16222F] border border-[#243647] rounded-xl p-5">
                <h3 className="text-base font-bold text-white mb-4">⚡ Accesos Rápidos</h3>
                <div className="space-y-3">
                  <button onClick={() => { setActiveTab('tratamientos'); resetTreatmentForm(); setIsNewTreatmentModalOpen(true); }} className="w-full flex items-center justify-between p-3.5 bg-[#1B2A38] hover:bg-[#243647] border border-[#243647] rounded-xl text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#10B981]/10 text-[#10B981] rounded-lg"><Receipt className="w-5 h-5" /></div>
                      <div>
                        <p className="text-sm font-bold text-white">Nuevo Presupuesto</p>
                        <p className="text-xs text-gray-400">Cotización de tratamientos</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>

                  <button onClick={() => { setActiveTab('agenda'); resetAppointmentForm(); setIsNewAppointmentModalOpen(true); }} className="w-full flex items-center justify-between p-3.5 bg-[#1B2A38] hover:bg-[#243647] border border-[#243647] rounded-xl text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Calendar className="w-5 h-5" /></div>
                      <div>
                        <p className="text-sm font-bold text-white">Agendar Nueva Cita</p>
                        <p className="text-xs text-gray-400">Programar fecha y hora</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 2. GESTIÓN DE PACIENTES */}
        {activeTab === 'pacientes' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Pacientes</h2>
                <p className="text-sm text-gray-400">Administración de expedientes y registros generales de la clínica</p>
              </div>
              <button 
                onClick={() => { resetPatientForm(); setIsNewPatientModalOpen(true); }}
                className="flex items-center gap-2 bg-[#10B981] hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Nuevo Paciente
              </button>
            </header>

            <div className="bg-[#16222F] border border-[#243647] rounded-xl p-5 shadow-xl">
              <div className="mb-6 max-w-md relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  placeholder="Buscar paciente por ID o Nombre..."
                  className="w-full bg-[#0F1720] border border-[#243647] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-[#1B2A38] text-gray-400 border-b border-[#243647]">
                    <tr>
                      <th className="py-3.5 px-4">ID</th>
                      <th className="py-3.5 px-4">Nombre Completo</th>
                      <th className="py-3.5 px-4">F. Nacimiento</th>
                      <th className="py-3.5 px-4">Teléfono</th>
                      <th className="py-3.5 px-4">Correo Electrónico</th>
                      <th className="py-3.5 px-4">Contacto de Emergencia</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243647]">
                    {filteredPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-[#1B2A38]/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#10B981]">#{patient.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{patient.name}</td>
                        <td className="py-3.5 px-4 text-gray-400">{patient.dob || '—'}</td>
                        <td className="py-3.5 px-4 text-gray-300">{patient.phone}</td>
                        <td className="py-3.5 px-4 text-gray-300">{patient.email}</td>
                        <td className="py-3.5 px-4 text-gray-400">{patient.emergency_contact}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingPatient(patient);
                                setPatientForm({
                                  name: patient.name || '',
                                  dob: patient.dob || '',
                                  phone: patient.phone === '—' ? '' : (patient.phone || ''),
                                  email: patient.email === '—' ? '' : (patient.email || ''),
                                  emergency_contact: patient.emergency_contact === '—' ? '' : (patient.emergency_contact || '')
                                });
                              }}
                              className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-amber-400 rounded-lg border border-[#243647]"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeletePatient(patient.id)}
                              className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-rose-400 rounded-lg border border-[#243647]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 3. EXPEDIENTE CLÍNICO */}
        {activeTab === 'expediente' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Expediente Clínico Unificado</h2>
                <p className="text-sm text-gray-400">Atención odontológica asignada, antecedentes y archivos adjuntos</p>
              </div>
              <button 
                onClick={() => { resetRecordForm(); setIsNewRecordModalOpen(true); }}
                className="flex items-center gap-2 bg-[#10B981] hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Nuevo Expediente
              </button>
            </header>

            <div className="bg-[#16222F] border border-[#243647] rounded-xl p-5 shadow-xl">
              <div className="mb-6 max-w-md relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={recordSearchTerm}
                  onChange={(e) => setRecordSearchTerm(e.target.value)}
                  placeholder="Buscar por ID, Paciente, Doctor o Fecha..."
                  className="w-full bg-[#0F1720] border border-[#243647] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-[#1B2A38] text-gray-400 border-b border-[#243647]">
                    <tr>
                      <th className="py-3.5 px-4">ID Exp</th>
                      <th className="py-3.5 px-4">Fecha</th>
                      <th className="py-3.5 px-4">Paciente</th>
                      <th className="py-3.5 px-4">Doctor Tratante</th>
                      <th className="py-3.5 px-4">Alergias</th>
                      <th className="py-3.5 px-4">Notas / Diagnóstico</th>
                      <th className="py-3.5 px-4 text-center">Adjunto</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243647]">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-[#1B2A38]/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#10B981]">#{record.id}</td>
                        <td className="py-3.5 px-4 text-gray-300 font-mono text-xs">{new Date(record.created_at).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{record.patients?.name || 'Paciente no encontrado'}</td>
                        <td className="py-3.5 px-4 text-indigo-400 font-medium">{record.users?.full_name || 'Sin Asignar'}</td>
                        <td className="py-3.5 px-4 text-rose-400 font-medium">{record.allergies || 'Ninguna'}</td>
                        <td className="py-3.5 px-4 text-gray-300 max-w-xs truncate">{record.notes}</td>
                        <td className="py-3.5 px-4 text-center">
                          {record.document_url ? (
                            <a href={record.document_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#10B981] underline">Ver Adjunto</a>
                          ) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setViewingRecordItem(record)} title="Ver Expediente Clínico" className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-indigo-400 rounded-lg border border-[#243647]">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handlePrintRecord(record)} title="Imprimir" className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-emerald-400 rounded-lg border border-[#243647]">
                              <Printer className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleOpenEditRecord(record)} title="Editar" className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-amber-400 rounded-lg border border-[#243647]">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteRecord(record.id)} title="Eliminar" className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-rose-400 rounded-lg border border-[#243647]">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 4. ODONTOGRAMA DIGITAL */}
        {activeTab === 'odontograma' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Módulo de Odontogramas Clínicos</h2>
                <p className="text-sm text-gray-400">Historial de mapeos anatómicos guardados por paciente</p>
              </div>
              <button 
                onClick={() => { resetOdontogramForm(); setIsOdontogramFormModalOpen(true); }}
                className="flex items-center gap-2 bg-[#10B981] hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Nuevo Odontograma
              </button>
            </header>

            <div className="bg-[#16222F] border border-[#243647] rounded-xl p-5 shadow-xl">
              <div className="mb-6 max-w-md relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={odontogramSearchTerm}
                  onChange={(e) => setOdontogramSearchTerm(e.target.value)}
                  placeholder="Buscar por ID o Nombre del Paciente..."
                  className="w-full bg-[#0F1720] border border-[#243647] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-[#1B2A38] text-gray-400 border-b border-[#243647]">
                    <tr>
                      <th className="py-3.5 px-4">Paciente</th>
                      <th className="py-3.5 px-4">Última Actualización</th>
                      <th className="py-3.5 px-4">Hallazgos Registrados</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243647]">
                    {filteredOdontograms.length > 0 ? (
                      filteredOdontograms.map((item) => (
                        <tr key={item.patient_id} className="hover:bg-[#1B2A38]/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">{item.patient_name} <span className="text-xs text-gray-500 font-mono">(#{item.patient_id})</span></td>
                          <td className="py-3.5 px-4 text-gray-300 font-mono text-xs">{new Date(item.updated_at).toLocaleString()}</td>
                          <td className="py-3.5 px-4"><span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-semibold">{item.count} superficies</span></td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => setViewingOdontogramItem(item)} title="Ver" className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-indigo-400 rounded-lg border border-[#243647]"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => handlePrintOdontogram(item)} title="Imprimir" className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-emerald-400 rounded-lg border border-[#243647]"><Printer className="w-4 h-4" /></button>
                              <button onClick={() => handleOpenEditOdontogram(item)} title="Editar" className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-amber-400 rounded-lg border border-[#243647]"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteOdontogramRecord(item.patient_id)} title="Borrar" className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-rose-400 rounded-lg border border-[#243647]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-gray-400">No hay odontogramas registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 5. PLANES DE TRATAMIENTO & PRESUPUESTOS */}
        {activeTab === 'tratamientos' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Planes de Tratamiento & Presupuestos</h2>
                <p className="text-sm text-gray-400">Cotizaciones clínicas, desglose de costos y control de aprobación</p>
              </div>
              <button 
                onClick={() => { resetTreatmentForm(); setIsNewTreatmentModalOpen(true); }}
                className="flex items-center gap-2 bg-[#10B981] hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#10B981]/10 self-start md:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Nuevo Presupuesto
              </button>
            </header>

            <div className="bg-[#16222F] border border-[#243647] rounded-xl p-5 shadow-xl">
              <div className="mb-6 max-w-md relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={treatmentSearchTerm}
                  onChange={(e) => setTreatmentSearchTerm(e.target.value)}
                  placeholder="Buscar por ID, Paciente o Título..."
                  className="w-full bg-[#0F1720] border border-[#243647] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-[#1B2A38] text-gray-400 border-b border-[#243647]">
                    <tr>
                      <th className="py-3.5 px-4">ID / Fecha</th>
                      <th className="py-3.5 px-4">Paciente</th>
                      <th className="py-3.5 px-4">Título del Plan</th>
                      <th className="py-3.5 px-4">Doctor Responsable</th>
                      <th className="py-3.5 px-4">Total Presupuesto</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243647]">
                    {filteredTreatmentPlans.length > 0 ? (
                      filteredTreatmentPlans.map((plan) => (
                        <tr key={plan.id} className="hover:bg-[#1B2A38]/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs text-white">
                            <span className="text-[#10B981] font-bold">#{plan.id}</span>
                            <span className="block text-gray-400 text-[11px]">{new Date(plan.created_at).toLocaleDateString()}</span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">{plan.patients?.name || '—'}</td>
                          <td className="py-3.5 px-4 text-gray-200 font-medium">{plan.title}</td>
                          <td className="py-3.5 px-4 text-indigo-400">{plan.users?.full_name || 'Sin Asignar'}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">${parseFloat(plan.total || 0).toFixed(2)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              plan.status === 'Aprobado' || plan.status === 'En Proceso'
                                ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                                : plan.status === 'Finalizado'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {plan.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => setViewingTreatmentItem(plan)} title="Ver Presupuesto" className="p-1.5 bg-[#1B2A38] text-indigo-400 rounded-lg border border-[#243647]"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handlePrintTreatmentPlan(plan)} title="Imprimir PDF" className="p-1.5 bg-[#1B2A38] text-emerald-400 rounded-lg border border-[#243647]"><Printer className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleOpenEditTreatmentPlan(plan)} title="Editar" className="p-1.5 bg-[#1B2A38] text-amber-400 rounded-lg border border-[#243647]"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteTreatmentPlan(plan.id)} title="Borrar" className="p-1.5 bg-[#1B2A38] text-rose-400 rounded-lg border border-[#243647]"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-gray-400">No hay planes de tratamiento registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 6. AGENDA MULTIVISTA */}
        {activeTab === 'agenda' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Agenda Multivista de Citas</h2>
                <p className="text-sm text-gray-400">Programación de atención, control de estatus y disponibilidad médica</p>
              </div>
              <button 
                onClick={() => { resetAppointmentForm(); setIsNewAppointmentModalOpen(true); }}
                className="flex items-center gap-2 bg-[#10B981] hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Agendar Nueva Cita
              </button>
            </header>

            <div className="bg-[#16222F] border border-[#243647] rounded-xl p-5 shadow-xl">
              <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-1.5 bg-[#0F1720] border border-[#243647] p-1.5 rounded-xl w-full xl:w-auto">
                  <button onClick={() => setAgendaViewMode('this_week')} className={`px-3 py-2 rounded-lg text-xs font-bold ${agendaViewMode === 'this_week' ? 'bg-[#10B981] text-slate-950' : 'text-gray-400'}`}>📅 Esta Semana</button>
                  <button onClick={() => setAgendaViewMode('next_week')} className={`px-3 py-2 rounded-lg text-xs font-bold ${agendaViewMode === 'next_week' ? 'bg-[#10B981] text-slate-950' : 'text-gray-400'}`}>📆 Próxima Semana</button>
                  <button onClick={() => setAgendaViewMode('this_month')} className={`px-3 py-2 rounded-lg text-xs font-bold ${agendaViewMode === 'this_month' ? 'bg-[#10B981] text-slate-950' : 'text-gray-400'}`}>🗓️ Este Mes</button>
                  <button onClick={() => setAgendaViewMode('all')} className={`px-3 py-2 rounded-lg text-xs font-bold ${agendaViewMode === 'all' ? 'bg-[#10B981] text-slate-950' : 'text-gray-400'}`}>📋 Todas</button>
                </div>

                <div className="w-full xl:w-72 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={appointmentSearchTerm}
                    onChange={(e) => setAppointmentSearchTerm(e.target.value)}
                    placeholder="Buscar cita..."
                    className="w-full bg-[#0F1720] border border-[#243647] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-[#1B2A38] text-gray-400 border-b border-[#243647]">
                    <tr>
                      <th className="py-3.5 px-4">Fecha y Hora</th>
                      <th className="py-3.5 px-4">Paciente</th>
                      <th className="py-3.5 px-4">Tratamiento</th>
                      <th className="py-3.5 px-4">Doctor Tratante</th>
                      <th className="py-3.5 px-4">Estatus</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243647]">
                    {filteredAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-[#1B2A38]/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-white">{appt.appointment_date} <span className="text-[#10B981] font-bold block">{appt.appointment_time}</span></td>
                        <td className="py-3.5 px-4 font-semibold text-white">{appt.patients?.name || '—'}</td>
                        <td className="py-3.5 px-4 text-gray-300">{appt.service}</td>
                        <td className="py-3.5 px-4 text-indigo-400">{appt.users?.full_name || 'Sin Asignar'}</td>
                        <td className="py-3.5 px-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#10B981]/10 text-[#10B981]">{appt.status}</span></td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleSendWhatsApp(appt)} title="Enviar WhatsApp" className="p-1.5 bg-[#1B2A38] text-emerald-400 rounded-lg border border-[#243647]"><MessageSquare className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleUpdateAppointmentStatus(appt.id, 'Confirmada')} title="Confirmar" className="p-1.5 bg-[#1B2A38] text-[#10B981] rounded-lg border border-[#243647]"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleUpdateAppointmentStatus(appt.id, 'Atendida')} title="Atendida" className="p-1.5 bg-[#1B2A38] text-blue-400 rounded-lg border border-[#243647]"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleOpenEditAppointment(appt)} title="Editar" className="p-1.5 bg-[#1B2A38] text-amber-400 rounded-lg border border-[#243647]"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteAppointment(appt.id)} title="Borrar" className="p-1.5 bg-[#1B2A38] text-rose-400 rounded-lg border border-[#243647]"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 7. GESTIÓN DE USUARIOS */}
        {activeTab === 'usuarios' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Usuarios & Personal Clínico</h2>
                <p className="text-sm text-gray-400">Administración de odontólogos tratantes, administradores y recepción</p>
              </div>
              <button 
                onClick={() => { resetUserForm(); setIsNewUserModalOpen(true); }}
                className="flex items-center gap-2 bg-[#10B981] hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Nuevo Usuario
              </button>
            </header>

            <div className="bg-[#16222F] border border-[#243647] rounded-xl p-5 shadow-xl">
              <div className="mb-6 max-w-md relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, correo o rol..."
                  className="w-full bg-[#0F1720] border border-[#243647] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-[#1B2A38] text-gray-400 border-b border-[#243647]">
                    <tr>
                      <th className="py-3.5 px-4">Nombre Completo</th>
                      <th className="py-3.5 px-4">Correo Electrónico</th>
                      <th className="py-3.5 px-4">Rol Asignado</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243647]">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-[#1B2A38]/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">{user.full_name}</td>
                        <td className="py-3.5 px-4 text-gray-300">{user.email}</td>
                        <td className="py-3.5 px-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400">{user.role}</span></td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setEditingUser(user); setUserForm({ full_name: user.full_name, email: user.email, role: user.role }); }} className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-amber-400 rounded-lg border border-[#243647]"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 bg-[#1B2A38] hover:bg-[#243647] text-rose-400 rounded-lg border border-[#243647]"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </main>

      {/* --- MODALES DEL SISTEMA --- */}

      {/* Modal 1: Paciente */}
      {(isNewPatientModalOpen || editingPatient) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16222F] border border-[#243647] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => { setIsNewPatientModalOpen(false); resetPatientForm(); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-4">{editingPatient ? 'Editar Paciente' : 'Nuevo Registro de Paciente'}</h3>
            {formError && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 rounded-lg text-xs">{formError}</div>}
            <form onSubmit={editingPatient ? handleUpdatePatient : handleCreatePatient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre Completo *</label>
                <input type="text" value={patientForm.name} onChange={(e) => setPatientForm({...patientForm, name: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white focus:border-[#10B981]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Fecha de Nacimiento *</label>
                <input type="date" max={maxDate} value={patientForm.dob} onChange={(e) => setPatientForm({...patientForm, dob: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white focus:border-[#10B981]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Teléfono</label>
                  <input type="text" value={patientForm.phone} onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Correo</label>
                  <input type="text" value={patientForm.email} onChange={(e) => setPatientForm({...patientForm, email: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Contacto de Emergencia</label>
                <input type="text" value={patientForm.emergency_contact} onChange={(e) => setPatientForm({...patientForm, emergency_contact: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#243647]">
                <button type="button" onClick={() => { setIsNewPatientModalOpen(false); resetPatientForm(); }} className="px-4 py-2 text-xs text-gray-400">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-[#10B981] text-slate-950 font-bold rounded-lg text-xs">{editingPatient ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Usuario */}
      {(isNewUserModalOpen || editingUser) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16222F] border border-[#243647] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => { setIsNewUserModalOpen(false); resetUserForm(); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-4">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario / Doctor'}</h3>
            {formError && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 rounded-lg text-xs">{formError}</div>}
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre Completo *</label>
                <input type="text" value={userForm.full_name} onChange={(e) => setUserForm({...userForm, full_name: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico *</label>
                <input type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Rol Asignado *</label>
                <select value={userForm.role} onChange={(e) => setUserForm({...userForm, role: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white">
                  <option value="doctor">Doctor / Odontólogo</option>
                  <option value="admin">Administrador</option>
                  <option value="receptionist">Recepcionista</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#243647]">
                <button type="button" onClick={() => { setIsNewUserModalOpen(false); resetUserForm(); }} className="px-4 py-2 text-xs text-gray-400">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-[#10B981] text-slate-950 font-bold rounded-lg text-xs">{editingUser ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Expediente Clínico (Formulario) */}
      {(isNewRecordModalOpen || editingRecord) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16222F] border border-[#243647] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setIsNewRecordModalOpen(false); resetRecordForm(); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-4">{editingRecord ? 'Editar Expediente' : 'Nuevo Expediente Unificado'}</h3>
            {formError && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 rounded-lg text-xs">{formError}</div>}
            
            <form onSubmit={editingRecord ? handleUpdateRecord : handleCreateRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Paciente *</label>
                  <select 
                    disabled={!!editingRecord} 
                    value={recordForm.patient_id || ''} 
                    onChange={(e) => handleSelectPatientForRecord(e.target.value)} 
                    className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#10B981] disabled:opacity-50"
                  >
                    <option value="" className="bg-[#0F1720] text-gray-400">-- Seleccionar Paciente --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id.toString()} className="bg-[#0F1720] text-white">
                        #{p.id} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Doctor Tratante *</label>
                  <select 
                    value={recordForm.doctor_id || ''} 
                    onChange={(e) => setRecordForm({...recordForm, doctor_id: e.target.value})} 
                    className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="" className="bg-[#0F1720] text-gray-400">-- Seleccionar Doctor --</option>
                    {doctorsOnly.map(d => (
                      <option key={d.id} value={d.id} className="bg-[#0F1720] text-white">
                        {d.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DATOS DE FILIACIÓN AUTOCOMPLETADOS */}
              <div className="p-3 bg-[#0F1720] border border-[#243647] rounded-xl space-y-2 text-xs">
                <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Datos de Filiación Autocompletados</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 block">F. Nacimiento:</span>
                    <span className="text-white font-medium">{recordForm.dob || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Correo Electrónico:</span>
                    <span className="text-white font-medium truncate block">{recordForm.email || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Sexo *</label>
                  <select value={recordForm.gender} onChange={(e) => setRecordForm({...recordForm, gender: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white">
                    <option value="Masculino" className="bg-[#0F1720] text-white">Masculino</option>
                    <option value="Femenino" className="bg-[#0F1720] text-white">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Ocupación</label>
                  <input type="text" value={recordForm.occupation} onChange={(e) => setRecordForm({...recordForm, occupation: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Alergias</label>
                <input type="text" value={recordForm.allergies} onChange={(e) => setRecordForm({...recordForm, allergies: e.target.value})} placeholder="Ej. Penicilina (o 'Ninguna')" className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Enfermedades Crónicas</label>
                  <input type="text" value={recordForm.chronic_conditions} onChange={(e) => setRecordForm({...recordForm, chronic_conditions: e.target.value})} placeholder="Ej. Hipertensión (o 'Ninguna')" className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Medicamentos Actuales</label>
                  <input type="text" value={recordForm.medications} onChange={(e) => setRecordForm({...recordForm, medications: e.target.value})} placeholder="Ej. Metformina (o 'Ninguno')" className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Adjuntar Archivo (Radiografía / PDF)</label>
                <input type="file" accept="image/*,.pdf" onChange={(e) => setSelectedFile(e.target.files[0])} className="w-full text-xs text-gray-400 bg-[#0F1720] border border-[#243647] rounded-lg p-2" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notas Clínicas & Diagnóstico *</label>
                <textarea rows="3" value={recordForm.notes} onChange={(e) => setRecordForm({...recordForm, notes: e.target.value})} placeholder="Detalle de valoración odontológica..." className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white" />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#243647]">
                <button type="button" onClick={() => { setIsNewRecordModalOpen(false); resetRecordForm(); }} className="px-4 py-2 text-xs text-gray-400">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-[#10B981] text-slate-950 font-bold rounded-lg text-xs">{editingRecord ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Citas de Agenda */}
      {(isNewAppointmentModalOpen || editingAppointment) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16222F] border border-[#243647] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => { setIsNewAppointmentModalOpen(false); resetAppointmentForm(); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-4">{editingAppointment ? 'Editar Cita' : 'Agendar Nueva Cita'}</h3>
            {formError && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 rounded-lg text-xs">{formError}</div>}
            <form onSubmit={editingAppointment ? handleUpdateAppointment : handleCreateAppointment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Paciente *</label>
                  <select disabled={!!editingAppointment} value={appointmentForm.patient_id} onChange={(e) => setAppointmentForm({...appointmentForm, patient_id: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white disabled:opacity-50">
                    <option value="" className="bg-[#0F1720] text-gray-400">-- Seleccionar --</option>
                    {patients.map(p => <option key={p.id} value={p.id.toString()} className="bg-[#0F1720] text-white">#{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Doctor</label>
                  <select value={appointmentForm.doctor_id} onChange={(e) => setAppointmentForm({...appointmentForm, doctor_id: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white">
                    <option value="" className="bg-[#0F1720] text-gray-400">-- Seleccionar --</option>
                    {doctorsOnly.map(d => <option key={d.id} value={d.id} className="bg-[#0F1720] text-white">{d.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Tratamiento *</label>
                  <input type="text" value={appointmentForm.service} onChange={(e) => setAppointmentForm({...appointmentForm, service: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Estatus *</label>
                  <select value={appointmentForm.status} onChange={(e) => setAppointmentForm({...appointmentForm, status: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white">
                    <option value="Pendiente" className="bg-[#0F1720] text-white">Pendiente</option>
                    <option value="Confirmada" className="bg-[#0F1720] text-white">Confirmada</option>
                    <option value="Atendida" className="bg-[#0F1720] text-white">Atendida</option>
                    <option value="Cancelada" className="bg-[#0F1720] text-white">Cancelada</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Fecha *</label>
                  <input type="date" value={appointmentForm.appointment_date} onChange={(e) => setAppointmentForm({...appointmentForm, appointment_date: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Hora *</label>
                  <input type="time" value={appointmentForm.appointment_time} onChange={(e) => setAppointmentForm({...appointmentForm, appointment_time: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notas</label>
                <textarea rows="2" value={appointmentForm.notes} onChange={(e) => setAppointmentForm({...appointmentForm, notes: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg p-2 text-xs text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#243647]">
                <button type="button" onClick={() => { setIsNewAppointmentModalOpen(false); resetAppointmentForm(); }} className="px-4 py-2 text-xs text-gray-400">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-[#10B981] text-slate-950 font-bold rounded-lg text-xs">{editingAppointment ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Plan de Tratamiento / Presupuesto */}
      {(isNewTreatmentModalOpen || editingTreatmentPlan) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16222F] border border-[#243647] rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setIsNewTreatmentModalOpen(false); resetTreatmentForm(); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Receipt className="w-5 h-5 text-[#10B981]" /> {editingTreatmentPlan ? 'Editar Presupuesto' : 'Nuevo Plan de Tratamiento'}</h3>
            <p className="text-xs text-gray-400 mb-4">Agrega los procedimientos, cantidades y precios unitarios para generar la cotización.</p>

            {formError && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 rounded-lg text-xs">{formError}</div>}

            <form onSubmit={editingTreatmentPlan ? handleUpdateTreatmentPlan : handleCreateTreatmentPlan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Paciente *</label>
                  <select disabled={!!editingTreatmentPlan} value={treatmentForm.patient_id} onChange={(e) => setTreatmentForm({...treatmentForm, patient_id: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white disabled:opacity-50">
                    <option value="" className="bg-[#0F1720] text-gray-400">-- Seleccionar --</option>
                    {patients.map(p => <option key={p.id} value={p.id.toString()} className="bg-[#0F1720] text-white">#{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Doctor Tratante</label>
                  <select value={treatmentForm.doctor_id} onChange={(e) => setTreatmentForm({...treatmentForm, doctor_id: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white">
                    <option value="" className="bg-[#0F1720] text-gray-400">-- Seleccionar --</option>
                    {doctorsOnly.map(d => <option key={d.id} value={d.id} className="bg-[#0F1720] text-white">{d.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Título del Plan / Cotización</label>
                  <input type="text" value={treatmentForm.title} onChange={(e) => setTreatmentForm({...treatmentForm, title: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Estatus del Plan *</label>
                  <select value={treatmentForm.status} onChange={(e) => setTreatmentForm({...treatmentForm, status: e.target.value})} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-xs text-white">
                    <option value="En Borrador" className="bg-[#0F1720] text-white">En Borrador</option>
                    <option value="Aprobado" className="bg-[#0F1720] text-white">Aprobado</option>
                    <option value="En Proceso" className="bg-[#0F1720] text-white">En Proceso</option>
                    <option value="Finalizado" className="bg-[#0F1720] text-white">Finalizado</option>
                  </select>
                </div>
              </div>

              {/* LISTA DINÁMICA DE TRATAMIENTOS */}
              <div className="border-t border-[#243647] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider">Desglose de Procedimientos</span>
                  <button type="button" onClick={handleAddTreatmentItem} className="text-xs font-bold text-[#10B981] hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Agregar Ítem</button>
                </div>

                <div className="space-y-2">
                  {treatmentItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-[#0F1720] p-2 rounded-lg border border-[#243647]">
                      <input 
                        type="text" 
                        value={item.description} 
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Tratamiento / Procedimiento" 
                        className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                      />
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="Cant." 
                        className="w-16 bg-[#16222F] border border-[#243647] text-xs text-white text-center rounded p-1"
                      />
                      <input 
                        type="number" 
                        step="0.01" 
                        value={item.unit_price} 
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        placeholder="Precio $" 
                        className="w-24 bg-[#16222F] border border-[#243647] text-xs text-white text-right rounded p-1"
                      />
                      <span className="text-xs font-mono text-emerald-400 w-20 text-right font-bold">
                        ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                      </span>
                      {treatmentItems.length > 1 && (
                        <button type="button" onClick={() => handleRemoveTreatmentItem(index)} className="text-rose-400 p-1"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CÁLCULO DE TOTALES */}
              <div className="p-3 bg-[#0F1720] border border-[#243647] rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-300">Descuento Global (%):</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={treatmentForm.discount_percent} 
                    onChange={(e) => setTreatmentForm({...treatmentForm, discount_percent: e.target.value})}
                    className="w-16 bg-[#16222F] border border-[#243647] text-xs text-white text-center rounded p-1"
                  />
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block">Subtotal: ${calculateSubtotal().toFixed(2)}</span>
                  <span className="text-lg font-bold text-[#10B981]">Total Estimado: ${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notas / Condiciones de Pago</label>
                <textarea rows="2" value={treatmentForm.notes} onChange={(e) => setTreatmentForm({...treatmentForm, notes: e.target.value})} placeholder="Ej. Validez del presupuesto por 30 días..." className="w-full bg-[#0F1720] border border-[#243647] rounded-lg p-2.5 text-xs text-white" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#243647]">
                <button type="button" onClick={() => { setIsNewTreatmentModalOpen(false); resetTreatmentForm(); }} className="px-4 py-2 text-xs text-gray-400">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-[#10B981] text-slate-950 font-bold rounded-lg text-xs">{editingTreatmentPlan ? 'Actualizar Presupuesto' : 'Guardar Presupuesto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Formulario Odontograma */}
      {isOdontogramFormModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16222F] border border-[#243647] rounded-2xl w-full max-w-5xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setIsOdontogramFormModalOpen(false); resetOdontogramForm(); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-4">{editingOdontogramItem ? 'Editar Odontograma' : 'Nuevo Odontograma'}</h3>
            {formError && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 rounded-lg text-xs">{formError}</div>}
            
            <form onSubmit={handleSaveOdontogramForm} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Paciente *</label>
                  <select disabled={!!editingOdontogramItem} value={odontogramPatientId} onChange={(e) => setOdontogramPatientId(e.target.value)} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50">
                    <option value="" className="bg-[#0F1720] text-gray-400">-- Seleccionar --</option>
                    {patients.map(p => <option key={p.id} value={p.id.toString()} className="bg-[#0F1720] text-white">#{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Herramienta de Diagnóstico</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setActiveTool('caries')} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${activeTool === 'caries' ? 'bg-rose-500/20 text-rose-400 border-rose-500' : 'bg-[#0F1720] text-gray-400'}`}>🔴 Caries</button>
                    <button type="button" onClick={() => setActiveTool('done')} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${activeTool === 'done' ? 'bg-blue-500/20 text-blue-400 border-blue-500' : 'bg-[#0F1720] text-gray-400'}`}>🔵 Realizado</button>
                    <button type="button" onClick={() => setActiveTool('endo')} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${activeTool === 'endo' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' : 'bg-[#0F1720] text-gray-400'}`}>🟢 Endodoncia</button>
                    <button type="button" onClick={() => setActiveTool('missing')} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${activeTool === 'missing' ? 'bg-gray-500/20 text-gray-300 border-gray-500' : 'bg-[#0F1720] text-gray-400'}`}>⬛ Ausente</button>
                    <button type="button" onClick={() => setActiveTool('clear')} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${activeTool === 'clear' ? 'bg-amber-500/20 text-amber-400 border-amber-500' : 'bg-[#0F1720] text-gray-400'}`}>Borrar</button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-[#243647] pb-3">
                <button type="button" onClick={() => setOdontogramTypeView('adult')} className={`px-4 py-2 rounded-lg text-xs font-bold ${odontogramTypeView === 'adult' ? 'bg-[#10B981] text-slate-950' : 'bg-[#0F1720] text-gray-400 border'}`}>🦷 Adulto</button>
                <button type="button" onClick={() => setOdontogramTypeView('child')} className={`px-4 py-2 rounded-lg text-xs font-bold ${odontogramTypeView === 'child' ? 'bg-indigo-500 text-white' : 'bg-[#0F1720] text-gray-400 border'}`}>👶 Infantil</button>
              </div>

              <div className="bg-[#0F1720] border border-[#243647] p-4 rounded-xl">
                {odontogramTypeView === 'adult' ? (
                  <div className="space-y-4">
                    <div className="text-center text-[10px] text-gray-400 font-bold">MAXILAR SUPERIOR</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <ToothComponent key={num} number={num} name={`P${num}`} />)}
                    </div>
                    <div className="text-center text-[10px] text-gray-400 font-bold pt-4">MANDÍBULA INFERIOR</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <ToothComponent key={num} number={num} name={`P${num}`} />)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center text-[10px] text-gray-400 font-bold">MAXILAR SUPERIOR (TEMPORAL)</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {[55, 54, 53, 52, 51, 61, 62, 63, 64, 65].map(num => <ToothComponent key={num} number={num} name={`P${num}`} />)}
                    </div>
                    <div className="text-center text-[10px] text-gray-400 font-bold pt-4">MANDÍBULA INFERIOR (TEMPORAL)</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {[85, 84, 83, 82, 81, 71, 72, 73, 74, 75].map(num => <ToothComponent key={num} number={num} name={`P${num}`} />)}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Observaciones</label>
                <textarea rows="2" value={odontogramNotes} onChange={(e) => setOdontogramNotes(e.target.value)} className="w-full bg-[#0F1720] border border-[#243647] rounded-lg p-3 text-sm text-white" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#243647]">
                <button type="button" onClick={() => { setIsOdontogramFormModalOpen(false); resetOdontogramForm(); }} className="px-4 py-2 text-xs text-gray-400">Cancelar</button>
                <button type="submit" disabled={isSavingOdontogram} className="px-4 py-2 bg-[#10B981] text-slate-950 font-bold rounded-lg text-xs">{editingOdontogramItem ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 7: Consulta de Odontograma */}
      {viewingOdontogramItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16222F] border border-[#243647] rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setViewingOdontogramItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-4">Consulta de Odontograma — {viewingOdontogramItem.patient_name}</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-[#10B981] mb-2">Dentición Permanente</h4>
                <div className="flex flex-wrap justify-center gap-1.5 mb-2">
                  {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <ToothComponent key={num} number={num} name={`P${num}`} readOnly={true} teethState={viewingOdontogramItem.teeth} />)}
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <ToothComponent key={num} number={num} name={`P${num}`} readOnly={true} teethState={viewingOdontogramItem.teeth} />)}
                </div>
              </div>
              {viewingOdontogramItem.notes && (
                <div className="bg-[#0F1720] p-3 rounded-lg border border-[#243647]">
                  <span className="text-xs text-gray-400 block mb-1 font-semibold">Notas:</span>
                  <p className="text-xs text-white">{viewingOdontogramItem.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#243647]">
              <button onClick={() => handlePrintOdontogram(viewingOdontogramItem)} className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold"><Printer className="w-3.5 h-3.5 inline mr-1" /> Imprimir</button>
              <button onClick={() => setViewingOdontogramItem(null)} className="px-4 py-2 bg-[#10B981] text-slate-950 font-bold rounded-lg text-xs">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 8: Consulta de Presupuesto */}
      {viewingTreatmentItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16222F] border border-[#243647] rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setViewingTreatmentItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Receipt className="w-5 h-5 text-[#10B981]" /> Detalle del Presupuesto #{viewingTreatmentItem.id}</h3>
            <p className="text-xs text-gray-400 mb-4">Paciente: <strong className="text-white">{viewingTreatmentItem.patients?.name}</strong> | Doctor: <strong className="text-white">{viewingTreatmentItem.users?.full_name || 'Sin Asignar'}</strong></p>

            <div className="space-y-4">
              <div className="bg-[#0F1720] border border-[#243647] p-4 rounded-xl">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="text-[10px] uppercase text-gray-400 border-b border-[#243647]">
                    <tr>
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Procedimiento</th>
                      <th className="py-2 px-2 text-center">Cant.</th>
                      <th className="py-2 px-2 text-right">P. Unitario</th>
                      <th className="py-2 px-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243647]">
                    {(viewingTreatmentItem.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 font-mono text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-2 font-medium text-white">{it.description}</td>
                        <td className="py-2 px-2 text-center font-mono">{it.quantity}</td>
                        <td className="py-2 px-2 text-right font-mono">${parseFloat(it.unit_price || 0).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-mono text-emerald-400">${((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-[#0F1720] border border-[#243647] rounded-xl text-right">
                <span className="text-xs text-gray-400 block">Subtotal: ${parseFloat(viewingTreatmentItem.subtotal || 0).toFixed(2)}</span>
                {viewingTreatmentItem.discount_percent > 0 && (
                  <span className="text-xs text-rose-400 block">Descuento ({viewingTreatmentItem.discount_percent}%): -${(viewingTreatmentItem.subtotal * (viewingTreatmentItem.discount_percent / 100)).toFixed(2)}</span>
                )}
                <span className="text-xl font-bold text-[#10B981] block mt-1">Total Estimado: ${parseFloat(viewingTreatmentItem.total || 0).toFixed(2)}</span>
              </div>

              {viewingTreatmentItem.notes && (
                <div className="bg-[#0F1720] p-3 rounded-lg border border-[#243647]">
                  <span className="text-xs text-gray-400 block mb-1 font-semibold">Notas del Presupuesto:</span>
                  <p className="text-xs text-white">{viewingTreatmentItem.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#243647]">
              <button onClick={() => handlePrintTreatmentPlan(viewingTreatmentItem)} className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Imprimir Cotización</button>
              <button onClick={() => setViewingTreatmentItem(null)} className="px-4 py-2 bg-[#10B981] text-slate-950 font-bold rounded-lg text-xs">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 9: Consulta Completa de Expediente Clínico en Pantalla */}
      {viewingRecordItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16222F] border border-[#243647] rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setViewingRecordItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-[#10B981]/10 text-[#10B981] rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Expediente Clínico Unificado #{viewingRecordItem.id}</h3>
                <p className="text-xs text-gray-400">Atención registrada el {new Date(viewingRecordItem.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4 mt-5">
              {/* Sección 1: Datos de Atención y Paciente */}
              <div className="bg-[#0F1720] border border-[#243647] p-4 rounded-xl space-y-2 text-xs">
                <h4 className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider mb-2">1. Datos del Paciente & Doctor</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-400 block">Paciente:</span>
                    <strong className="text-white text-sm">{viewingRecordItem.patients?.name || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Doctor Tratante:</span>
                    <strong className="text-indigo-400 text-sm">{viewingRecordItem.users?.full_name || 'Sin Asignar'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Fecha de Nacimiento:</span>
                    <span className="text-white">{viewingRecordItem.patients?.dob || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Sexo / Ocupación:</span>
                    <span className="text-white">{viewingRecordItem.gender || '—'} / {viewingRecordItem.occupation || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Teléfono / Correo:</span>
                    <span className="text-white">{viewingRecordItem.patients?.phone || '—'} | {viewingRecordItem.patients?.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Contacto de Emergencia:</span>
                    <span className="text-white">{viewingRecordItem.patients?.emergency_contact || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Sección 2: Antecedentes Médicos */}
              <div className="bg-[#0F1720] border border-[#243647] p-4 rounded-xl space-y-2 text-xs">
                <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">2. Antecedentes Médicos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-2.5 bg-[#16222F] rounded-lg border border-[#243647]">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Alergias:</span>
                    <span className="text-rose-400 font-medium">{viewingRecordItem.allergies || 'Ninguna'}</span>
                  </div>
                  <div className="p-2.5 bg-[#16222F] rounded-lg border border-[#243647]">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Enfermedades Crónicas:</span>
                    <span className="text-amber-400 font-medium">{viewingRecordItem.chronic_conditions || 'Ninguna'}</span>
                  </div>
                  <div className="p-2.5 bg-[#16222F] rounded-lg border border-[#243647]">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Medicamentos Actuales:</span>
                    <span className="text-indigo-400 font-medium">{viewingRecordItem.medications || 'Ninguno'}</span>
                  </div>
                </div>
              </div>

              {/* Sección 3: Notas Clínicas & Diagnóstico */}
              <div className="bg-[#0F1720] border border-[#243647] p-4 rounded-xl text-xs">
                <h4 className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider mb-2">3. Diagnóstico & Evolución Clínica</h4>
                <p className="text-white whitespace-pre-wrap leading-relaxed">{viewingRecordItem.notes}</p>
              </div>

              {/* Sección 4: Archivo Adjunto */}
              {viewingRecordItem.document_url && (
                <div className="bg-[#0F1720] border border-[#243647] p-4 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Paperclip className="w-4 h-4" />
                    <span>Archivo Clínico / Radiografía Adjunta</span>
                  </div>
                  <a 
                    href={viewingRecordItem.document_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 border border-[#10B981]/30 rounded-lg font-semibold"
                  >
                    Abrir Archivo
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#243647]">
              <button 
                onClick={() => handlePrintRecord(viewingRecordItem)} 
                className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Ficha
              </button>
              <button 
                onClick={() => setViewingRecordItem(null)} 
                className="px-4 py-2 bg-[#10B981] text-slate-950 font-bold rounded-lg text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}