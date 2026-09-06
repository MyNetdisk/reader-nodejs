USE reader;
CREATE TABLE IF NOT EXISTS `books` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL COMMENT '书名',
  `author` VARCHAR(255) NOT NULL COMMENT '作者',
  `description` TEXT NULL COMMENT '简介',
  `cover_url` VARCHAR(500) NULL COMMENT '封面地址',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO `books` (`title`, `author`, `description`, `cover_url`) VALUES
  ('三体', '刘慈欣', '地球往事三部曲之一，文革期间天文学家叶文洁向宇宙发出信号，引来三体文明。', 'https://m.media-amazon.com/images/I/71a9ic1xXOL._SY466_.jpg'),
  ('活着', '余华', '地主少爷福贵嗜赌成性，赌光了家业一贫如洗，之后人生不断经历苦难。', 'https://m.media-amazon.com/images/I/41QTwCpnqUL._SY445_SX342_.jpg'),
  ('百年孤独', '加西亚·马尔克斯', '布恩迪亚家族七代人的传奇故事，魔幻现实主义代表作。', 'https://m.media-amazon.com/images/I/81m5T3q8ZL._SY466_.jpg')
  ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);
SELECT id, title, author FROM `books` ORDER BY id;
