import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { colors } from '../src/constants/colors';

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" color={colors.primary} size={22} />
        </Pressable>
        <Text style={styles.topTitle}>About</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.logoMark}>
          <Feather name="check-square" color={colors.surface} size={34} />
        </View>
        <Text style={styles.appName}>Attendance Manager</Text>
        <Text style={styles.appSubtitle}>Offline classroom attendance, reports, and fines ledger.</Text>
      </View>

      <InfoCard
        icon="user"
        title="Author Profile"
        rows={[
          ['Name', 'Saif Ur Rehman'],
          ['Designation', 'Developer and Teacher'],
          [
            'About',
            'Developed by Saif Ur Rehman, a passionate web developer and teacher. Combining technical expertise with real classroom experience, this app was built to streamline daily administrative tasks and help educators focus on what matters most - their students.',
          ],
        ]}
      />

      <ContactCard />

      <InfoCard
        icon="shield"
        title="Privacy"
        rows={[
          ['Student Data', 'Stored locally on this device'],
          ['Teacher PIN', 'Stored as a local hash'],
          ['Internet', 'Not required for app data'],
        ]}
      />

      <Text style={styles.footerText}>Version 1.0.0</Text>
    </ScrollView>
  );
}

function ContactCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Feather name="phone" color={colors.primary} size={20} />
        </View>
        <Text style={styles.cardTitle}>Contact</Text>
      </View>

      <Pressable style={styles.contactRow} onPress={() => openWhatsApp('923464572726')}>
        <View style={styles.whatsappIcon}>
          <FontAwesome name="whatsapp" color={colors.surface} size={20} />
        </View>
        <View style={styles.contactTextBlock}>
          <Text style={styles.infoLabel}>WhatsApp</Text>
          <Text style={styles.infoValue}>03464572726</Text>
        </View>
      </Pressable>

      <Pressable style={styles.contactRow} onPress={() => Linking.openURL('mailto:saif72726@gmail.com')}>
        <View style={styles.mailIcon}>
          <Feather name="mail" color={colors.primary} size={20} />
        </View>
        <View style={styles.contactTextBlock}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>saif72726@gmail.com</Text>
        </View>
      </Pressable>
    </View>
  );
}

function openWhatsApp(phoneNumber: string) {
  Linking.openURL(`https://wa.me/${phoneNumber}`);
}

function InfoCard({
  icon,
  title,
  rows,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  rows: [string, string][];
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Feather name={icon} color={colors.primary} size={20} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>

      {rows.map(([label, value]) => (
        <View key={label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  backButtonPlaceholder: {
    height: 46,
    width: 46,
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 22,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  appName: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  appSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  infoRow: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  contactRow: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  whatsappIcon: {
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  mailIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  contactTextBlock: {
    flex: 1,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 3,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
});
