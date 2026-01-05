import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

export const BrandHeader = () => {
    return (
        <View style={styles.container}>
            <Image
                source={require('../assets/images/wallan_brand_logo.png')}
                style={styles.logo}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        alignItems: 'flex-start',
        paddingLeft: 0, // Absolute left alignment
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    logo: {
        width: 180,
        height: 60,
    },
});
