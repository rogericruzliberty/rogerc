/**
 * Liberty Field App — useContacts Hook
 *
 * Manages contact import from device address book
 * via expo-contacts.
 */

import { useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';
import type { ContactFormData } from '../types';

export function useContacts() {
  const importContact = useCallback(async (): Promise<ContactFormData | null> => {
    const { status } = await Contacts.requestPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Liberty Field needs access to your contacts to import building manager and vendor info. Please enable contacts access in Settings.',
      );
      return null;
    }

    // Fetch contacts with all fields
    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.JobTitle,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.Company,
      ],
    });

    if (data.length === 0) {
      Alert.alert('No Contacts', 'No contacts found on this device.');
      return null;
    }

    // For now, return the first selected contact
    // In production, this would open a contact picker modal
    return new Promise((resolve) => {
      // expo-contacts doesn't have a built-in picker, so we
      // present a simplified selection. In the full app, this
      // would use a searchable FlatList modal.
      const contact = data[0]; // Placeholder — full picker built in screen
      resolve({
        name: contact.name || '',
        title: contact.jobTitle || '',
        phone: contact.phoneNumbers?.[0]?.number || '',
        email: contact.emails?.[0]?.email || '',
        company: contact.company || '',
        roleType: 'OTHER',
        notes: '',
      });
    });
  }, []);

  return { importContact };
}
