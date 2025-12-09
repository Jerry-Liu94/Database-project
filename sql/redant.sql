-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 123.195.209.250    Database: redant
-- ------------------------------------------------------
-- Server version	8.0.44-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alembic_version`
--

DROP TABLE IF EXISTS `alembic_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alembic_version` (
  `version_num` varchar(32) NOT NULL,
  PRIMARY KEY (`version_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `api_token`
--

DROP TABLE IF EXISTS `api_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_token` (
  `token_id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `ix_api_token_token_id` (`token_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `api_token_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset`
--

DROP TABLE IF EXISTS `asset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset` (
  `asset_id` bigint NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `latest_version_id` bigint DEFAULT NULL,
  `uploaded_by_user_id` bigint NOT NULL,
  PRIMARY KEY (`asset_id`),
  KEY `ix_asset_asset_id` (`asset_id`),
  KEY `uploaded_by_user_id` (`uploaded_by_user_id`),
  KEY `latest_version_id` (`latest_version_id`),
  CONSTRAINT `asset_ibfk_1` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `asset_ibfk_2` FOREIGN KEY (`latest_version_id`) REFERENCES `version` (`version_id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_category`
--

DROP TABLE IF EXISTS `asset_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_category` (
  `asset_id` bigint NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`asset_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `asset_category_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`) ON DELETE CASCADE,
  CONSTRAINT `asset_category_ibfk_2` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`asset_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_tag`
--

DROP TABLE IF EXISTS `asset_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_tag` (
  `asset_id` bigint NOT NULL,
  `tag_id` int NOT NULL,
  PRIMARY KEY (`asset_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `asset_tag_ibfk_1` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`asset_id`) ON DELETE CASCADE,
  CONSTRAINT `asset_tag_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`tag_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `asset_id` bigint DEFAULT NULL,
  `action_type` varchar(100) NOT NULL,
  `action_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_tampered` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`log_id`),
  KEY `fk_audit_asset` (`asset_id`),
  KEY `idx_audit_user` (`user_id`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_audit_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`asset_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=203 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `parent_category_id` int DEFAULT NULL,
  PRIMARY KEY (`category_id`),
  KEY `idx_category_name` (`category_name`),
  KEY `parent_category_id` (`parent_category_id`),
  CONSTRAINT `category_ibfk_1` FOREIGN KEY (`parent_category_id`) REFERENCES `category` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comment`
--

DROP TABLE IF EXISTS `comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment` (
  `comment_id` bigint NOT NULL AUTO_INCREMENT,
  `asset_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `content` text NOT NULL,
  `target_info` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`comment_id`),
  KEY `fk_comment_asset` (`asset_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `comment_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_comment_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`asset_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `export_job`
--

DROP TABLE IF EXISTS `export_job`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `export_job` (
  `job_id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `status` varchar(50) NOT NULL,
  `file_path` varchar(1024) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`job_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `export_job_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `chk_status` CHECK ((`status` in (_utf8mb4'pending',_utf8mb4'running',_utf8mb4'completed',_utf8mb4'failed')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `metadata`
--

DROP TABLE IF EXISTS `metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metadata` (
  `asset_id` bigint NOT NULL,
  `filesize` bigint DEFAULT NULL,
  `resolution` varchar(50) DEFAULT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `encoding_format` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`asset_id`),
  CONSTRAINT `fk_metadata_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`asset_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_reset_token`
--

DROP TABLE IF EXISTS `password_reset_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_token` (
  `token_id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `password_reset_token_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permission`
--

DROP TABLE IF EXISTS `permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permission` (
  `permission_id` int NOT NULL AUTO_INCREMENT,
  `resource` varchar(100) NOT NULL,
  `action` varchar(50) NOT NULL,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uq_permission_resource_action` (`resource`,`action`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_permission`
--

DROP TABLE IF EXISTS `role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permission` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permission_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`),
  CONSTRAINT `role_permission_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `share_asset`
--

DROP TABLE IF EXISTS `share_asset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_asset` (
  `link_id` bigint NOT NULL,
  `asset_id` bigint NOT NULL,
  PRIMARY KEY (`link_id`,`asset_id`),
  KEY `fk_sa_asset` (`asset_id`),
  CONSTRAINT `fk_sa_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`asset_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sa_link` FOREIGN KEY (`link_id`) REFERENCES `share_link` (`link_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `share_link`
--

DROP TABLE IF EXISTS `share_link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_link` (
  `link_id` bigint NOT NULL AUTO_INCREMENT,
  `token` varchar(100) NOT NULL,
  `created_by_user_id` bigint NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `permission_type` varchar(50) NOT NULL,
  PRIMARY KEY (`link_id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_sharelink_token` (`token`),
  KEY `created_by_user_id` (`created_by_user_id`),
  CONSTRAINT `share_link_ibfk_1` FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `chk_permission_type` CHECK ((`permission_type` in (_utf8mb4'readonly',_utf8mb4'downloadable')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tag`
--

DROP TABLE IF EXISTS `tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tag` (
  `tag_id` int NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(50) NOT NULL,
  `is_ai_suggested` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `tag_name` (`tag_name`),
  KEY `idx_tag_name` (`tag_name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `user_name` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `mfa_secret` varchar(255) DEFAULT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_user_email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `version`
--

DROP TABLE IF EXISTS `version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `version` (
  `version_id` bigint NOT NULL AUTO_INCREMENT,
  `asset_id` bigint NOT NULL,
  `version_number` int NOT NULL DEFAULT '1',
  `storage_path` varchar(1024) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`version_id`),
  UNIQUE KEY `uq_asset_version_number` (`asset_id`,`version_number`),
  CONSTRAINT `fk_version_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`asset_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-09 19:46:09
